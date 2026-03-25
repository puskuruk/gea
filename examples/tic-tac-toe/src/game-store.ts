import { Store } from '@geajs/core'

type CellValue = 'X' | 'O' | null

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

class GameStore extends Store {
  board: CellValue[] = Array(9).fill(null)
  currentPlayer: 'X' | 'O' = 'X'
  winningLine: number[] = []
  scores = { X: 0, O: 0, draws: 0 }

  get winner(): CellValue | 'draw' | null {
    for (const [a, b, c] of WINNING_LINES) {
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a]
      }
    }
    if (this.board.every((cell) => cell !== null)) return 'draw'
    return null
  }

  get status(): string {
    const w = this.winner
    if (w === 'draw') return "It's a draw!"
    if (w) return `${w} wins!`
    return `${this.currentPlayer}'s turn`
  }

  get gameOver(): boolean {
    return this.winner !== null
  }

  makeMove(index: number) {
    if (this.board[index] || this.gameOver) return

    this.board[index] = this.currentPlayer

    const w = this.winner
    if (w === 'draw') {
      this.scores.draws++
    } else if (w) {
      this.scores[w]++
      for (const [a, b, c] of WINNING_LINES) {
        if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
          this.winningLine = [a, b, c]
          break
        }
      }
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X'
    }
  }

  reset() {
    this.board = Array(9).fill(null)
    this.currentPlayer = 'X'
    this.winningLine = []
  }
}

export default new GameStore()
