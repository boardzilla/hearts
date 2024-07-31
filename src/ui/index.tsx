import React from "react";
import { ProfileBadge, render, toggleSetting } from "@boardzilla/core";
import { default as setup, Card } from "../game/index.js";

import "./style.scss";

function handPosition(
  i: number,
  total: number,
  distance: number,
  width: number,
  height: number
): { left: number; top: number; height: number; width: number } {
  const area = {
    top: Math.sin((Math.PI * i * 2) / total) * distance * 50 + 50 - height / 2,
    left: Math.cos((Math.PI * i * 2) / total) * distance * 50 + 50 - width / 2,
    height,
    width,
  };
  return area;
}

render(setup, {
  boardSizes: [{
    name: "desktop",
    desktop: true,
    aspectRatio: 1,
  }],
  settings: {
    omnibus: toggleSetting("10♦️ worth negative 10 points?"),
    noPass: toggleSetting("have a no-pass round?"),
  },
  layout: (board, currentPlayer) => {
    board.disableDefaultAppearance();

    const otherPlayers = currentPlayer
      .others()
      .sort((a, b) => a.position - b.position);

    board.layout(currentPlayer.my("mat")!, {
      area: handPosition(1, otherPlayers.length + 1, 0.5, 100, 30),
      columns: { max: 1 },
      alignment: "center",
    });

    currentPlayer.my("mat")!.layout(currentPlayer.my("waiting")!, {
      area: { top: 30, left: 82, width: 18, height: 70 },
    });

    currentPlayer.my("mat")!.layout(currentPlayer.my("hand")!, {
      area: { top: 20, left: 0, width: 80, height: 80 },
    });

    currentPlayer.my("hand")!.layout(Card, {
      direction: "ltr",
      offsetColumn: 72,
    });

    board.all("mat").appearance({
      render: (mat) => (
        <div>
          <ProfileBadge player={mat.player!} /> {mat.player!.score}
        </div>
      ),
    });

    otherPlayers.forEach((other, i) => {
      board.layout(other.my("mat")!, {
        area: handPosition(
          i + 2,
          otherPlayers.length + 1,
          0.7,
          30,
          20
        ),
        columns: { max: 1 },
      });
      other.my("mat")!.layout(other.my("hand")!, {
        area: {top: 40, left: 0, width: 50, height: 40},
        columns: { max: 1 },
      });
      other.my("mat")!.layout(other.my("waiting")!, {
        area: {top: 50, left: 60, width: 40, height: 30},
        columns: { max: 1 },
      });

      other.my("hand")!.layout(Card, {
        rows: { max: 1 },
        offsetColumn: { x: 2, y: 0 },
        maxOverlap: 0,
        direction: "ltr",
      });
    });

    board.layout("middle", {
      area: { top: 30, left: 35, width: 30, height: 20 },
    });
    $.middle.layout(Card, {
      rows: 1,
    });

    board.layout("deck", {
      area: { top: 40, left: 40, width: 20, height: 20 },
    });
    $.deck.layout(Card, {
      rows: { max: 1 },
      offsetColumn: { x: 0.1, y: 0.1 },
      maxOverlap: 0,
      direction: "ltr",
    });

    board.all(Card).appearance({
      aspectRatio: 0.69,
      render: ({ name }) => (
        <div className="flipper">
          <div className="front"></div>
          <div className="back"></div>
        </div>
      ),
    });

    board.all("waiting").layout(Card, {
      rows: { max: 1 },
      offsetColumn: { x: 2, y: 2 },
      maxOverlap: 0,
      direction: "ltr",
    });
  },
});
