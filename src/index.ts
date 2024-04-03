import { Api as CgApi } from "chessground/api";
import { Config as CgConfig } from "chessground/config";
import { FEN } from "chessground/types";
import { uciToMove } from "chessground/util";
import { Color, makeSquare, makeUci, Move, opposite, Position } from "chessops";
import { scalachessCharPair } from "chessops/compat";
import { makeFen } from "chessops/fen";
import {
  CommentShape,
  parseComment,
  parsePgn,
  PgnNodeData,
  startingPosition,
  transform,
} from "chessops/pgn";
import { makeSanAndPlay, parseSan } from "chessops/san";

export type AnyNode = Node<MoveData>;

export declare class Node<T> {
  children: ChildNode<T>[];
  mainlineNodes(): Iterable<ChildNode<T>>;
  mainline(): Iterable<T>;
  end(): Node<T>;
}
export declare class ChildNode<T> extends Node<T> {
  data: T;
  constructor(data: T);
}

export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export class Path {
  constructor(readonly path: string) {}

  size = () => this.path.length / 2;

  head = (): Id => this.path.slice(0, 2);

  // returns an invalid path doesn't starting from root
  tail = (): Path => new Path(this.path.slice(2));

  init = (): Path => new Path(this.path.slice(0, -2));

  last = (): Id => this.path.slice(-2);

  empty = () => this.path == "";

  contains = (other: Path): boolean => this.path.startsWith(other.path);

  isChildOf = (parent: Path): boolean => this.init() === parent;

  append = (id: Id) => new Path(this.path + id);

  equals = (other: Path) => this.path == other.path;

  static root = new Path("");
}

export interface InitialOrMove {
  fen: FEN;
  turn: Color;
  check: boolean;
  comments: string[];
  shapes: CommentShape[];
  clocks: Clocks;
}

export interface MoveData extends InitialOrMove {
  path: Path;
  ply: number;
  move: Move;
  san: San;
  uci: Uci;
  startingComments: string[];
  nags: number[];
  emt?: number;
  data?: ChessMove;
  id?: string;
}

export type MoveNode = {
  children: MoveNode[];
  data?: ChessMove;
};

export interface ChessMove {
  path: {
    path: string;
  };
  ply: number;
  move: {
    from: number;
    to: number;
    san: string;
    uci: string;
  };
  san: string;
  uci: string;
  fen: string;
  turn: "white" | "black";
  check: boolean;
  comments?: string[];
  startingComments?: string[];
  nags?: Nag[];
  shapes?: Shape[];
  clocks?: Clocks;
  id: string;
}

interface Nag {
  symbol: string;
  description?: string;
}

interface Shape {
  type: string;
  from?: number;
  to?: number;
  color?: string;
}

interface Clocks {
  white?: number;
  black?: number;
}

export function childById(node: AnyNode, id: string): AnyNode | undefined {
  return node.children.find((child) => child.data?.id === id);
}

export function head(path: string): string {
  return path.slice(0, 2);
}

export function tail(path: string): string {
  return path.slice(2);
}

export type GoTo = "first" | "prev" | "next" | "last";

export type ShowMoves = false | "right" | "bottom" | "auto";
export type ShowPlayers = true | false | "auto";
export type Lichess = string | false;

export interface Opts {
  pgn: string;
  fen?: string;
  chessground?: CgConfig;
  orientation?: Color;
  showPlayers?: ShowPlayers;
  showMoves?: ShowMoves;
  showClocks?: boolean;
  showControls?: boolean;
  initialPly?: Ply | "last";
  scrollToMove?: boolean;
  drawArrows?: boolean;
  menu?: {
    getPgn?: {
      enabled?: boolean;
      fileName?: string;
    };
  };
  lichess?: Lichess;
  classes?: string;
  translate?: Translate;
}

export type Translate = (key: string) => string | undefined;

export interface Initial extends InitialOrMove {
  pos: Position;
}

export interface Player {
  name?: string;
  title?: string;
  rating?: number;
  isLichessUser: boolean;
}
export interface Players {
  white: Player;
  black: Player;
}

export interface Metadata {
  externalLink?: string;
  isLichess: boolean;
  timeControl?: {
    initial: number;
    increment: number;
  };
  orientation?: Color;
  result?: string | null;
}

const nodeAtPathFrom = (node: AnyNode, path: Path): AnyNode | undefined => {
  if (path.empty()) return node;
  const child = childById(node, path.head());
  return child ? nodeAtPathFrom(child, path.tail()) : undefined;
};

export type MoveNodeType = ChildNode<MoveData>;
export const isMoveNode = (n: AnyNode): n is MoveNodeType => "data" in n;
export const isMoveData = (d: InitialOrMove): d is MoveData => "uci" in d;

export class Game {
  mainline: MoveData[];

  constructor(
    readonly initial: Initial,
    readonly moves: AnyNode,
    readonly players: Players,
    readonly metadata: Metadata
  ) {
    this.mainline = Array.from(this.moves.mainline());
  }

  nodeAt = (path: Path): AnyNode | undefined =>
    nodeAtPathFrom(this.moves, path);

  dataAt = (path: Path): MoveData | Initial | undefined => {
    const node = this.nodeAt(path);
    return node ? (isMoveNode(node) ? node.data : this.initial) : undefined;
  };

  title = () =>
    this.players.white.name
      ? [
          this.players.white.title,
          this.players.white.name,
          "vs",
          this.players.black.title,
          this.players.black.name,
        ]
          .filter((x) => x && !!x.trim())
          .join("_")
          .replace(" ", "-")
      : "lichess-pgn-viewer";

  pathAtMainlinePly = (ply: Ply | "last") =>
    ply == 0
      ? Path.root
      : this.mainline[
          Math.max(
            0,
            Math.min(this.mainline.length - 1, ply == "last" ? 9999 : ply - 1)
          )
        ]?.path || Path.root;

  hasPlayerName = () =>
    !!(this.players.white?.name || this.players.black?.name);
}

export interface Comments {
  texts: string[];
  shapes: CommentShape[];
  clock?: number;
  emt?: number;
}

export const parseComments = (strings: string[]): Comments => {
  const comments = strings.map(parseComment);
  const reduceTimes = (times: Array<number | undefined>) =>
    times.reduce<number | undefined>(
      (last, time) => (typeof time == "undefined" ? last : time),
      undefined
    );
  return {
    texts: comments.map((c) => c.text).filter((t) => !!t),
    // @ts-ignore
    shapes: comments.flatMap((c) => c.shapes),
    clock: reduceTimes(comments.map((c) => c.clock)),
    emt: reduceTimes(comments.map((c) => c.emt)),
  };
};

export type Headers = Map<string, string>;

export function makeMetadata(headers: Headers, lichess: Lichess): Metadata {
  const site = headers.get("source") || headers.get("site");
  const result = headers.get("result");
  const tcs = headers
    .get("timecontrol")
    ?.split("+")
    .map((x) => parseInt(x));
  const timeControl =
    tcs && tcs[0]
      ? {
          initial: tcs[0],
          increment: tcs[1] || 0,
        }
      : undefined;
  const orientation = headers.get("orientation");
  return {
    externalLink: site && site.match(/^https?:\/\//) ? site : undefined,
    isLichess: !!(lichess && site?.startsWith(lichess)),
    timeControl,
    orientation:
      orientation === "white" || orientation === "black"
        ? orientation
        : undefined,
    result,
  };
}

export class State {
  constructor(
    readonly pos: Position,
    public path: Path,
    public clocks: Clocks
  ) {}
  clone = () => new State(this.pos.clone(), this.path, { ...this.clocks });
}

const makeClocks = (prev: Clocks, turn: Color, clk?: number): Clocks =>
  turn == "white" ? { ...prev, black: clk } : { ...prev, white: clk };

export const makeMoves = (
  start: Position,
  moves: Node<PgnNodeData>,
  metadata: Metadata
) =>
  transform<PgnNodeData, MoveData, State>(
    moves,
    new State(start, Path.root, {}),
    (state, node) => {
      const move = parseSan(state.pos, node.san);
      if (!move) return undefined;
      const moveId = scalachessCharPair(move);
      const path = state.path.append(moveId);
      const san = makeSanAndPlay(state.pos, move);
      state.path = path;
      const setup = state.pos.toSetup();
      const comments = parseComments(node.comments || []);
      const startingComments = parseComments(node.startingComments || []);
      const shapes = [...comments.shapes, ...startingComments.shapes];
      const ply =
        (setup.fullmoves - 1) * 2 + (state.pos.turn === "white" ? 0 : 1);
      let clocks = (state.clocks = makeClocks(
        state.clocks,
        state.pos.turn,
        comments.clock
      ));
      if (ply < 2 && metadata.timeControl)
        clocks = {
          white: metadata.timeControl.initial,
          black: metadata.timeControl.initial,
          ...clocks,
        };
      const moveNode: MoveData = {
        path,
        ply,
        id: moveId,
        move,
        san,
        uci: makeUci(move),
        fen: makeFen(state.pos.toSetup()),
        turn: state.pos.turn,
        check: state.pos.isCheck(),
        comments: comments.texts,
        startingComments: startingComments.texts,
        nags: node.nags || [],
        shapes,
        clocks,
        emt: comments.emt,
      };
      return moveNode;
    }
  );

function makePlayers(headers: Headers, metadata: Metadata): Players {
  const get = (color: Color, field: string): string | undefined => {
    const raw = headers.get(`${color}${field}`) || undefined;
    return raw == "?" || raw == "" ? undefined : raw;
  };
  const makePlayer = (color: Color): Player => {
    const name = get(color, "");
    return {
      name,
      title: get(color, "title"),
      rating: parseInt(get(color, "elo") || "") || undefined,
      isLichessUser:
        metadata.isLichess &&
        !!name?.match(/^[a-z0-9][a-z0-9_-]{0,28}[a-z0-9]$/i),
    };
  };
  return {
    white: makePlayer("white"),
    black: makePlayer("black"),
  };
}

export const makeGame = (pgn: string, lichess: Lichess = false): Game => {
  const game = parsePgn(pgn)[0] || parsePgn("*")[0];
  const start = startingPosition(game.headers).unwrap();
  const fen = makeFen(start.toSetup());
  const comments = parseComments(game.comments || []);
  const headers = new Map(
    Array.from(game.headers, ([key, value]) => [key.toLowerCase(), value])
  );
  const metadata = makeMetadata(headers, lichess);
  const initial: Initial = {
    fen,
    turn: start.turn,
    check: start.isCheck(),
    pos: start.clone(),
    comments: comments.texts,
    shapes: comments.shapes,
    clocks: {
      white: metadata.timeControl?.initial || comments.clock,
      black: metadata.timeControl?.initial || comments.clock,
    },
  };
  const moves = makeMoves(start, game.moves, metadata);
  const players = makePlayers(headers, metadata);
  return new Game(initial, moves, players, metadata);
};

export class PgnViewer {
  game: Game;
  path: Path;
  ground?: CgApi;
  div?: HTMLElement;
  flipped = false;
  pane = "board";
  autoScrollRequested = false;
  autoplay = false;

  constructor(readonly opts: Opts) {
    this.game = makeGame(opts.pgn, opts.lichess);
    opts.orientation = opts.orientation || this.game.metadata.orientation;
    if (opts.initialPly) {
      this.path = this.game.pathAtMainlinePly(opts.initialPly);
    } else {
      this.path = Path.root;
    }
  }

  setAutoPlay = (autoplay: boolean) => {
    this.autoplay = autoplay;
  };

  // returns new path
  addNode = (node: MoveNode, parentPath: string): string | undefined => {
    const newPath = parentPath + (node.data?.id || "");
    const existing = this.nodeAtPathOrNull(newPath);

    if (existing) {
      return newPath;
    }
    const updated = this.updateAt(parentPath, (parent: MoveNode) =>
      parent.children.push(node)
    );
    return updated ? newPath : undefined;
  };

  addNodes = (nodes: MoveNode[], path: string): string | undefined => {
    const node = nodes[0];
    if (!node) return path;
    const newPath = this.addNode(node, path);
    return newPath ? this.addNodes(nodes.slice(1), newPath) : undefined;
  };

  updateAt = (parentPath: string, update: (node: MoveNode) => void) => {
    const node = this.nodeAtPathOrNull(parentPath || "");
    if (node) {
      update(node);
      return node;
    }
    return;
  };

  nodeAtPathOrNull = (path: string) => {
    return this.nodeAtPathOrNullFrom(this.game.moves, path);
  };

  nodeAtPathOrNullFrom = (node: AnyNode, path: string): any => {
    if (path === "") return node;
    const child = childById(node, head(path));
    return child ? this.nodeAtPathOrNullFrom(child, tail(path)) : null;
  };

  curNode = (): AnyNode => this.game.nodeAt(this.path) || this.game.moves;
  curData = (): InitialOrMove =>
    this.game.dataAt(this.path) || this.game.initial;
  curPly = () => {
    const mainLinePly = this.curNode()?.children?.[0]?.data.ply;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const altLinePly = (this.curNode()?.data?.ply || 0) + 1;

    return mainLinePly || altLinePly;
  };

  goTo = (to: GoTo, focus = true) => {
    const path =
      to == "first"
        ? Path.root
        : to == "prev"
        ? this.path.init()
        : to == "next"
        ? this.game.nodeAt(this.path)?.children[0]?.data.path
        : this.game.pathAtMainlinePly("last");
    this.toPath(path || this.path, focus);
  };

  goToMoveAtFenFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fenFromUrl = urlParams.get("fen");
    if (fenFromUrl) {
      const fenFromUrlDecoded = decodeURIComponent(fenFromUrl);

      const node = this.game.mainline.find((node) =>
        node.fen.startsWith(fenFromUrlDecoded)
      );

      const correspondingPath = node?.path;

      if (correspondingPath) {
        this.toPath(correspondingPath);
      } else {
        this.goTo("last");
      }
    } else {
      this.goTo("last");
    }
  };

  canGoTo = (to: GoTo) =>
    to == "prev" || to == "first"
      ? !this.path.empty()
      : !!this.curNode().children[0];

  toPath = (path: Path, focus = true) => {
    this.path = path;
    this.pane = "board";
    this.autoScrollRequested = true;
    this.redrawGround();
    // this.redraw()
    if (focus) this.focus();
  };

  focus = () => this.div?.focus();

  toggleMenu = () => {
    this.pane = this.pane == "board" ? "menu" : "board";
    // this.redraw()
  };
  togglePgn = () => {
    this.pane = this.pane == "pgn" ? "board" : "pgn";
    // this.redraw()
  };

  orientation = () => {
    const base = this.opts.orientation || "white";
    return this.flipped ? opposite(base) : base;
  };

  flip = () => {
    this.flipped = !this.flipped;
    this.pane = "board";
    this.redrawGround();
    // this.redraw()
  };

  cgState = (): CgConfig => {
    const data = this.curData();
    const lastMove = isMoveData(data)
      ? uciToMove(data.uci)
      : this.opts.chessground?.lastMove;
    return {
      fen: data.fen,
      orientation: this.orientation(),
      check: data.check,
      lastMove,
      turnColor: data.turn,
    };
  };

  setGround = (cg: CgApi) => {
    this.ground = cg;
    this.redrawGround();
  };

  private redrawGround = () =>
    this.withGround((g) => {
      g.set(this.cgState());
      g.setShapes(
        this.curData().shapes.map((s) => ({
          orig: makeSquare(s.from),
          dest: makeSquare(s.to),
          brush: s.color,
        }))
      );
    });
  private withGround = (f: (cg: CgApi) => void) =>
    this.ground && f(this.ground);
}
