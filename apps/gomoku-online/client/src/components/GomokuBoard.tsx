import type { Stone } from "../types";

interface Props {
  board: Stone[];
  lastMove: number | null;
  disabled: boolean;
  onMove: (index: number) => void;
}

const SIZE = 15;

export default function GomokuBoard({ board, lastMove, disabled, onMove }: Props) {
  return (
    <div className="board-frame">
      <div className="board" role="grid" aria-label="15乘15五子棋棋盘">
        {board.map((stone, index) => {
          const row = Math.floor(index / SIZE);
          const col = index % SIZE;
          const star = [3, 7, 11].includes(row) && [3, 7, 11].includes(col);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={`${row + 1}行${col + 1}列${stone === 1 ? "黑棋" : stone === 2 ? "白棋" : "空位"}`}
              className={`cell ${stone ? "occupied" : ""}`}
              disabled={disabled || stone !== 0}
              onClick={() => onMove(index)}
            >
              {star && stone === 0 && <span className="star-point" />}
              {stone !== 0 && <span className={`stone ${stone === 1 ? "black" : "white"}`} />}
              {lastMove === index && <span className="last-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
