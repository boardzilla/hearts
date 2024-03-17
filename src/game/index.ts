import {
  Game,
  createGame,
  Player,
  Do,
  createGameClasses,
} from "@boardzilla/core";

class Hearts extends Game<HeartsPlayer, Hearts> {
  /**
   * Any overall properties of your game go here
   */
  round = 0;
  startingPlayer?: HeartsPlayer;
  heartsBroken: boolean = false;
  omnibus = false;
  noPass = false;
}

export class HeartsPlayer extends Player<HeartsPlayer, Hearts> {
  /**
   * Any properties of your players that are specific to your game go here
   */
  score: number = 0;
}

const { Space, Piece } = createGameClasses<HeartsPlayer, Hearts>();

export { Space };

type Suit = "club" | "heart" | "spade" | "diamond";
/**
 * Define your game's custom pieces and spaces.
 */
export class Card extends Piece {
  suit: Suit;
  value: string;
  rank: number;
}

export default createGame<HeartsPlayer, Hearts>(
  HeartsPlayer,
  Hearts,
  (game) => {
    const { action } = game;
    const { playerActions, whileLoop, loop, eachPlayer, everyPlayer } =
      game.flowCommands;

    /**
     * Register all custom pieces and spaces
     */
    game.registerClasses(Card);

    game.omnibus = game.setting("omnibus") as boolean;
    game.noPass = game.setting("noPass") as boolean;

    /**
     * Create your game board's layout and all included pieces.
     */
    for (const player of game.players) {
      const mat = game.create(Space, "mat", { player });
      const hand = mat.create(Space, "hand", { player });
      const waiting = mat.create(Space, "waiting", { player });
      hand.onEnter(Card, (t) => {
        t.showOnlyTo(player);
        hand.sortBy([
          (c: Card) => ["heart", "spade", "diamond", "club"].indexOf(c.suit),
          (c: Card) => -c.rank,
        ]);
      });
      waiting.onEnter(Card, (e) => e.hideFromAll());
    }

    game.create(Space, "middle");
    $.middle.onEnter(Card, (e) => e.showToAll());

    game.create(Space, "deck");
    $.deck.onEnter(Card, (e) => e.hideFromAll());
    $.deck.setOrder("stacking");
    ["club", "spade", "diamond", "heart"].forEach((suit: Suit) => {
      [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "j",
        "q",
        "k",
        "a",
      ].forEach((value, rank) => {
        $.deck.create(Card, `${value}-${suit}`, { suit, value, rank });
      });
    });

    /**
     * Define all possible game actions.
     */
    game.defineActions({
      pickThree: (player) => {
        const directions = game.noPass
          ? ["left", "center", "right", null]
          : ["left", "center", "right"];
        const direction = directions[game.round % directions.length];
        if (direction === null) {
          return action();
        }
        return action({
          prompt: "Pick three and pass them to the " + direction,
        })
          .chooseOnBoard("cards", player.my("hand")!.all(Card), {
            number: 3,
          })
          .do(({ cards }) =>
            cards.forEach((c) =>
              c.putInto(
                game.players
                  .seatedNext(player, (game.round % directions.length) + 1)
                  .my("waiting")!
              )
            )
          );
      },
      playCard: (player) =>
        action()
          .chooseOnBoard(
            "card",
            () => {
              if (player.my("hand")!.has(Card, "2-club")) {
                return player.allMy(Card, "2-club");
              }
              const firstCard = $.middle.first(Card);
              if (!firstCard) {
                const allHearts = !player
                  .my("hand")!
                  .has(Card, (c) => c.suit !== "heart");
                return player
                  .my("hand")!
                  .all(
                    Card,
                    (c) => game.heartsBroken || allHearts || c.suit !== "heart"
                  );
              }
              const followingCards = player
                .my("hand")!
                .all(Card, { suit: firstCard.suit });
              return followingCards.length === 0
                ? player.my("hand")!.all(Card)
                : followingCards;
              // TODO: why doesn't this work?
              // }, {skipIf: () => player.my('hand')!.all(Card).length === 1}).
            },
            { skipIf: "never" }
          )
          .do(({ card }) => {
            if (card.suit === "heart") {
              game.heartsBroken = true;
            }
            card.putInto($.middle);
          }),
    });

    /**
     * Define the game flow, starting with board setup and progressing through all
     * phases and turns.
     */
    game.defineFlow(
      whileLoop({
        while: () => !game.players.find((p) => p.score >= 100),
        do: loop(
          () => {
            // TODO: i don't understand how to refactor this
            $.deck.shuffle();
            $.deck.all(Card).forEach((card, index) => {
              card.putInto(
                game.players[index % game.players.length].my(Space, {
                  name: "hand",
                })!
              );
            });
          },
          everyPlayer({ do: playerActions({ actions: ["pickThree"] }) }),
          () => {
            game.players.forEach((p) =>
              p.my("waiting")?.all(Card).putInto(p.my("hand")!)
            );
            const firstPlayer = game.players.find((p) => p.has(Card, "2-club"));
            game.startingPlayer = firstPlayer;
          },
          loop(
            eachPlayer({
              name: "play",
              startingPlayer: () => game.startingPlayer!,
              do: playerActions({ name: "playCard", actions: ["playCard"] }),
            }),
            () => {
              const playedCards = $.middle.all(Card);
              let highest = 0;
              playedCards.forEach((c) => {
                if (c.suit !== playedCards[0].suit) return;
                if (c.rank < highest) return;
                highest = c.rank;
              });
              const trickWinnerIndex = playedCards.findIndex(
                (c) => c.suit === playedCards[0].suit && c.rank === highest
              );
              const trickWinner = game.players.seatedNext(
                game.startingPlayer!,
                trickWinnerIndex
              );
              $.middle.all(Card).putInto(trickWinner.my("waiting")!);
              game.startingPlayer = trickWinner;
              if (!game.players[0].my("hand")!.has(Card)) {
                Do.break();
              }
            }
          ),
          () => {
            const scores = game.players.map((p) => {
              let score = 0;
              const cards = p.my("waiting")!.all(Card);
              cards.forEach((c) => {
                if (c.name === "q-spade") {
                  score += 13;
                } else if (c.suit === "heart") {
                  score += 1;
                }
              });
              return score;
            });
            const controlled = scores.find((s) => s === 26);
            scores.forEach((score, i) => {
              game.players[i].score +=
                controlled !== undefined ? 26 - scores[i] : scores[i];
            });
            if (game.omnibus) {
              game.players.forEach((p, i) => {
                if (p.has("Card", "10-diamond")) p.score -= 10;
              });
            }
            game.round++;
            game.startingPlayer = undefined;
            game.heartsBroken = false;
            game.all(Card).putInto($.deck);
            $.deck.shuffle();
            $.deck.all(Card).forEach((card, index) => {
              card.putInto(
                game.players[index % game.players.length].my(Space, {
                  name: "hand",
                })!
              );
            });
          }
        ),
      })
    );
  }
);
