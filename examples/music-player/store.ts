import { Store } from '@geajs/core'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number // seconds
  playlistId: string
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    duration: 244,
    playlistId: 'pl1',
  },
  { id: 't2', title: 'Intro', artist: 'The xx', album: 'xx', duration: 126, playlistId: 'pl1' },
  { id: 't3', title: 'Crystalised', artist: 'The xx', album: 'xx', duration: 209, playlistId: 'pl1' },
  { id: 't4', title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', album: 'AM', duration: 272, playlistId: 'pl2' },
  { id: 't5', title: 'R U Mine?', artist: 'Arctic Monkeys', album: 'AM', duration: 199, playlistId: 'pl2' },
  {
    id: 't6',
    title: "Why'd You Only Call Me When You're High?",
    artist: 'Arctic Monkeys',
    album: 'AM',
    duration: 161,
    playlistId: 'pl2',
  },
  { id: 't7', title: 'Heat Waves', artist: 'Glass Animals', album: 'Dreamland', duration: 238, playlistId: 'pl3' },
  { id: 't8', title: 'Youth', artist: 'Glass Animals', album: 'Dreamland', duration: 244, playlistId: 'pl3' },
  { id: 't9', title: 'Tangerine', artist: 'Glass Animals', album: 'Dreamland', duration: 179, playlistId: 'pl3' },
]

export const PLAYLISTS: Playlist[] = [
  { id: 'pl1', name: 'Chill Vibes', trackIds: ['t1', 't2', 't3'] },
  { id: 'pl2', name: 'Rock Mix', trackIds: ['t4', 't5', 't6'] },
  { id: 'pl3', name: 'Dream Pop', trackIds: ['t7', 't8', 't9'] },
]

const TRACKS_MAP: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]))

class MusicStore extends Store {
  playlists: Playlist[] = PLAYLISTS
  tracks: Record<string, Track> = TRACKS_MAP
  activePlaylistId = 'pl1'
  currentTrackId: string | null = 't1'
  isPlaying = false
  progress = 0 // 0–100
  volume = 70
  shuffle = false
  repeat: 'none' | 'one' | 'all' = 'none'
  searchQuery = ''
  ticker: ReturnType<typeof setInterval> | null = null

  get activePlaylist(): Playlist | null {
    return this.playlists.find((p) => p.id === this.activePlaylistId) ?? null
  }

  get activeTracks(): Track[] {
    return (this.activePlaylist?.trackIds ?? []).map((id) => this.tracks[id]).filter(Boolean)
  }

  get currentTrack(): Track | null {
    return this.currentTrackId ? (this.tracks[this.currentTrackId] ?? null) : null
  }

  get progressTime(): string {
    const t = this.currentTrack
    if (!t) return '0:00'
    return fmt(Math.round((this.progress / 100) * t.duration))
  }

  get durationTime(): string {
    return fmt(this.currentTrack?.duration ?? 0)
  }

  get filteredTracks(): Track[] {
    const q = this.searchQuery.toLowerCase()
    if (!q) return this.activeTracks
    return this.activeTracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
  }

  fmt(secs: number): string {
    return fmt(secs)
  }

  selectPlaylist(id: string): void {
    this.activePlaylistId = id
    this.searchQuery = ''
  }

  playTrack(id: string): void {
    this.currentTrackId = id
    this.progress = 0
    this.isPlaying = true
    this.startTicker()
  }

  togglePlay(): void {
    if (!this.currentTrackId) {
      const first = this.activeTracks[0]
      if (first) this.playTrack(first.id)
      return
    }
    this.isPlaying = !this.isPlaying
    if (this.isPlaying) {
      this.startTicker()
    } else {
      this.stopTicker()
    }
  }

  nextTrack(): void {
    const tracks = this.shuffle ? [...TRACKS].sort(() => Math.random() - 0.5) : this.activeTracks
    const idx = tracks.findIndex((t) => t.id === this.currentTrackId)
    const next = tracks[(idx + 1) % tracks.length]
    if (next) this.playTrack(next.id)
  }

  prevTrack(): void {
    if (this.progress > 10) {
      this.progress = 0
      return
    }
    const tracks = this.activeTracks
    const idx = tracks.findIndex((t) => t.id === this.currentTrackId)
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length]
    if (prev) this.playTrack(prev.id)
  }

  setVolume(value: number[]): void {
    this.volume = value[0]
  }

  setProgress(value: number[]): void {
    this.progress = value[0]
  }

  toggleShuffle(): void {
    this.shuffle = !this.shuffle
  }

  cycleRepeat(): void {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all']
    const idx = modes.indexOf(this.repeat)
    this.repeat = modes[(idx + 1) % modes.length]
  }

  setSearch(e: { target: { value: string } }): void {
    this.searchQuery = e.target.value
  }

  private startTicker(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = setInterval(() => {
      if (!this.isPlaying) return
      this.progress = Math.min(100, this.progress + 100 / (this.currentTrack?.duration ?? 200))
      if (this.progress >= 100) {
        if (this.repeat === 'one') {
          this.progress = 0
        } else {
          this.stopTicker()
          this.nextTrack()
        }
      }
    }, 1000)
  }

  private stopTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
    }
  }
}

export default new MusicStore()
