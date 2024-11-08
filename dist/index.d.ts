import { Chessground } from "chessground";
import { Api as CgApi } from "chessground/api";
import { Config as CgConfig } from "chessground/config";
import { FEN, Key } from "chessground/types";
import { Role } from "chessground/types";
import { uciToMove } from "chessground/util";
import { Color, Move, Position } from "chessops";
import { Square, charToRole, parseSquare } from "chessops";
import { Chess } from "chessops/chess";
import { parseFen } from "chessops/fen";
import { ChildNode, CommentShape, Node, PgnNodeData, parsePgn, startingPosition } from "chessops/pgn";
import { makeSanVariation } from "chessops/san";
export { Chess, parseFen, parseSquare, makeSanVariation, Chessground, uciToMove, charToRole, parsePgn, startingPosition, };
export type { Color, Position, Move, FEN, Square, Key, Role, CgConfig, CgApi };
export type AnyNode = Node<MoveData>;
export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;
export interface PvMove {
    text?: string;
    fen?: string;
    san?: string;
    uci?: string;
}
export declare const renderMove: (ctrl: PgnViewer) => (move: MoveData, isVariation?: boolean) => string;
export declare const moveTurn: (move: MoveData) => string;
export declare const emptyMove: () => string;
export declare const commentNode: (comment: string) => {
    text: string;
    type: string;
};
export declare const indexNode: (turn: number) => string;
export declare const parenOpen: () => string;
export declare const parenClose: () => string;
export type MoveToDom = (move: MoveData) => string;
export declare const makeMainVariation: (moveDom: MoveToDom, node: MoveNode) => (string | {
    text: string;
    type: string;
})[];
export declare const makeVariationMoves: (moveDom: MoveToDom, node: MoveNode) => string[];
export declare const makeMoveNodes: (ctrl: PgnViewer) => string[];
export declare function renderPvMoves(currentFen: string, pv: readonly string[]): PvMove[];
export declare class Path {
    readonly path: string;
    constructor(path: string);
    size: () => number;
    head: () => Id;
    tail: () => Path;
    init: () => Path;
    last: () => Id;
    empty: () => boolean;
    contains: (other: Path) => boolean;
    isChildOf: (parent: Path) => boolean;
    append: (id: Id) => Path;
    equals: (other: Path) => boolean;
    static root: Path;
}
export interface InitialOrMove {
    fen: FEN;
    turn: Color;
    check: boolean;
    comments: string[];
    shapes: CommentShape[];
    clocks: Clocks;
    path?: {
        path: string;
    };
    ply?: number;
    id?: string;
    move?: Move;
    san?: San;
    uci?: Uci;
    startingComments?: string[];
    nags?: number[];
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
    nags?: number[];
    shapes?: Shape[];
    clocks?: Clocks;
    id: string;
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
export declare function childById(node: AnyNode, id: string): AnyNode | undefined;
export declare function head(path: string): string;
export declare function tail(path: string): string;
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
    comment?: string;
}
export type MoveNodeType = ChildNode<MoveData>;
export declare const isMoveNode: (n: AnyNode) => n is MoveNodeType;
export declare const isMoveData: (d: InitialOrMove) => d is MoveData;
export declare class Game {
    readonly initial: Initial;
    readonly moves: AnyNode;
    readonly players: Players;
    readonly metadata: Metadata;
    mainline: MoveData[];
    constructor(initial: Initial, moves: AnyNode, players: Players, metadata: Metadata);
    nodeAt: (path: Path) => AnyNode | undefined;
    dataAt: (path: Path) => MoveData | Initial | undefined;
    title: () => string;
    pathAtMainlinePly: (ply: Ply | "last") => Path;
    hasPlayerName: () => boolean;
}
export interface Comments {
    texts: string[];
    shapes: CommentShape[];
    clock?: number;
    emt?: number;
}
export declare const parseComments: (strings: string[]) => Comments;
export type Headers = Map<string, string>;
export declare function makeMetadata(headers: Headers, lichess: Lichess): Metadata;
export declare class State {
    readonly pos: Position;
    path: Path;
    clocks: Clocks;
    constructor(pos: Position, path: Path, clocks: Clocks);
    clone: () => State;
}
export declare const makeMoves: (start: Position, moves: Node<PgnNodeData>, metadata: Metadata) => Node<MoveData>;
export declare const makeGame: (pgn: string, lichess?: Lichess) => Game;
export declare class PgnViewer {
    readonly opts: Opts;
    game: Game;
    path: Path;
    ground?: CgApi;
    div?: HTMLElement;
    flipped: boolean;
    pane: string;
    autoScrollRequested: boolean;
    autoplay: boolean;
    constructor(opts: Opts);
    /**
    * Returns the list of moves starting from the given path and traversing backward to the first move of that line.
    * @param path The path string from which to start.
    * @returns Array of MoveData representing the moves from the beginning of the given line to the provided path.
    */
    getMovesFromPath(path: string): MoveData[];
    /**
     * Returns a hashed string of the current PGN of the game using a simple hash function.
     * @returns {string} The hashed PGN string.
     */
    getHashedPgn(): string;
    /**
     * Computes a simple hash of a string.
     * @param {string} message The input string.
     * @returns {string} The hash as a hexadecimal string.
     */
    private simpleHash;
    /**
    * Removes all comments containing "Result: *".
    */
    removeAllResultComments(): void;
    /**
     * Checks recursively if there is any comment in all moves.
     * @returns boolean indicating if any comment exists in the game.
     */
    hasAnyComment(): boolean;
    /**
     * Checks recursively if there is any NAG in all moves.
     * @returns boolean indicating if any NAG exists in the game.
     */
    hasAnyNag(): boolean;
    /**
     * Recursively removes comments and NAGs from all nodes.
     * @param node The node from which to remove comments and NAGs.
     */
    removeAllCommentsAndNags(node: AnyNode): void;
    /**
     * Removes all comments and NAGs from the game.
     */
    clearAllCommentsAndNags(): void;
    /**
     * Promotes a variation
     * @param variationPath The path to the variation.
     */
    promoteVariation(variationPath: string): void;
    /**
     * Adds a Numeric Annotation Glyph (NAG) to the specified move.
     * @param path The path to the move where the NAG should be added.
     * @param nag The NAG number to add.
     */
    addNag: (path: string, nag: number) => void;
    /**
     * Removes a Numeric Annotation Glyph (NAG) from the specified move.
     * @param path The path to the move where the NAG should be removed.
     * @param nag The NAG number to remove.
     */
    removeNag: (path: string, nag: number) => void;
    deleteMovesAfterPath(path: string): void;
    deleteMoveAndAllFollowing(path: string): void;
    editGameComment(newComment: string): void;
    plyPrefix: (node: MoveNode) => string;
    /**
     * Converts a list of NAGs to the standard PGN notation.
     * @param nags Array of NAG numbers.
     * @returns Formatted string with NAGs for PGN.
     */
    private formatNags;
    /**
     * Recursive function to format a node and its children into PGN notation.
     * @param node The current node in the move tree.
     * @param forcePly Indicates whether to force the ply number at the start of this line.
     * @returns Formatted PGN string for the node and its children.
     */
    exportNode(node: MoveNode, forcePly: boolean): string;
    getGamePgn: () => string;
    setAutoPlay: (autoplay: boolean) => void;
    addComment: (path: string, comment: string) => void;
    deleteComment: (path: string, index: number) => void;
    editComment: (path: string, index: number, newComment: string) => void;
    addNode: (node: MoveNode, parentPath: string) => string | undefined;
    deleteNode: (nodePath: string) => MoveData | null;
    addNodes: (nodes: MoveNode[], path: string) => string | undefined;
    updateAt: (parentPath: string, update: (node: MoveNode) => void) => any;
    nodeAtPathOrNull: (path: string) => any;
    nodeAtPathOrNullFrom: (node: AnyNode, path: string) => any;
    curNode: () => AnyNode;
    curData: () => InitialOrMove;
    curPly: () => any;
    isCurrentPathLastOnMainline: () => boolean;
    goTo: (to: GoTo, focus?: boolean) => void;
    isPathOnMainLine: (path: string) => boolean;
    goToMoveAtFenFromUrl: () => void;
    canGoTo: (to: GoTo) => boolean;
    toPath: (path: Path, focus?: boolean) => void;
    focus: () => void | undefined;
    toggleMenu: () => void;
    togglePgn: () => void;
    orientation: () => "white" | "black";
    flip: () => void;
    cgState: () => CgConfig;
    setGround: (cg: CgApi) => void;
    private redrawGround;
    private withGround;
}
