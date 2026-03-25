import { Component } from '@geajs/core'
import store from './store'
import type { Track } from './store'

export default class TrackRow extends Component {
  declare props: { track: Track; index: number }

  template({ track, index }: { track: Track; index: number }) {
    const isPlaying = store.currentTrackId === track.id && store.isPlaying
    const isCurrent = store.currentTrackId === track.id

    return (
      <tr
        class={`track-row ${isCurrent ? 'current' : ''}`}
        click={() => store.playTrack(track.id)}
        data-track-id={track.id}
      >
        <td class="track-num">
          {isPlaying ? (
            <span class="playing-icon" aria-label="Now playing">
              ▶
            </span>
          ) : (
            <span class="track-index">{index + 1}</span>
          )}
        </td>
        <td class="track-info-cell">
          <span class="track-title">{track.title}</span>
          <span class="track-artist">{track.artist}</span>
        </td>
        <td class="track-album">{track.album}</td>
        <td class="track-duration">{store.fmt(track.duration)}</td>
      </tr>
    )
  }
}
