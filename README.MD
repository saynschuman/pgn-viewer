# Pgn Viewer

This library is an advanced tool for working with chess games and their visualization in web applications. It is based on [lichess-pgn-viewer](https://github.com/lichess-org/pgn-viewer), a library by Thibault Duplessis and other contributors, developed for the lichess.org website.

## Features

- Visualization of chess boards with interactive capabilities.
- Navigation through game moves in PGN format.
- Support for FEN to display specific game states.
- Customization of the chess board's appearance and behavior.
- Analysis and rendering of PGN files.

## Installation

To install the library, use npm or yarn:

```bash
npm i pgn-viewer
yarn add pgn-viewer
```

## Usage Example

```javascript
import { Game, PgnViewer } from 'your-library-name';

const pgnViewer = new PgnViewer({
  pgn: 'Your PGN text here',
  // other options...
});
```


## Licensing

This library is open-source software licensed under the GPL-3.0-or-later license. This means it is based on lichess-pgn-viewer, which is also distributed under the GPL-3.0-or-later license. All derivative work must comply with the terms of this license.

## Acknowledgements

Special thanks to Thibault Duplessis and the lichess.org team for their contribution to the chess community. The library utilizes chessground, chessops, and other dependencies to provide its functionality.

## Support

If you have any questions or suggestions, please open an issue in the GitHub repository.

## Contact

For further information, email saynschuman@gmail.com
