import { Component } from '@geajs/core'
import Slider from '@geajs/ui/slider'
import Tooltip from '@geajs/ui/tooltip'
import store from './store'

export default class NowPlayingBar extends Component {
  template() {
    const track = store.currentTrack

    return (
      <div class="now-playing-bar">
        {/* Track Info */}
        <div class="np-track-info">
          {track ? (
            <>
              <div class="np-art">{track.title[0]}</div>
              <div class="np-meta">
                <span class="np-title">{track.title}</span>
                <span class="np-artist">{track.artist}</span>
              </div>
            </>
          ) : (
            <span class="np-empty">No track selected</span>
          )}
        </div>

        {/* Controls */}
        <div class="np-controls">
          <div class="np-buttons">
            <Tooltip content={`Shuffle: ${store.shuffle ? 'on' : 'off'}`}>
              <button
                class={`ctrl-btn ${store.shuffle ? 'active' : ''}`}
                click={store.toggleShuffle}
                aria-label="Shuffle"
                data-shuffle={store.shuffle ? 'on' : 'off'}
              >
                ⇄
              </button>
            </Tooltip>
            <button class="ctrl-btn" click={store.prevTrack} aria-label="Previous track">
              ⏮
            </button>
            <button
              class="ctrl-btn ctrl-btn-play"
              click={store.togglePlay}
              aria-label={store.isPlaying ? 'Pause' : 'Play'}
              data-playing={store.isPlaying ? 'true' : 'false'}
            >
              {store.isPlaying ? '⏸' : '▶'}
            </button>
            <button class="ctrl-btn" click={store.nextTrack} aria-label="Next track">
              ⏭
            </button>
            <Tooltip content={`Repeat: ${store.repeat}`}>
              <button
                class={`ctrl-btn ${store.repeat !== 'none' ? 'active' : ''}`}
                click={store.cycleRepeat}
                aria-label="Repeat"
                data-repeat={store.repeat}
              >
                {store.repeat === 'one' ? '↺¹' : '↺'}
              </button>
            </Tooltip>
          </div>

          <div class="np-progress">
            <span class="time-label">{store.progressTime}</span>
            <Slider
              value={[store.progress]}
              min={0}
              max={100}
              step={0.1}
              onValueChange={(d: any) => store.setProgress(d.value)}
              class="progress-slider"
            />
            <span class="time-label">{store.durationTime}</span>
          </div>
        </div>

        {/* Volume */}
        <div class="np-volume">
          <span class="volume-icon" aria-label="Volume">
            🔊
          </span>
          <Slider
            value={[store.volume]}
            min={0}
            max={100}
            onValueChange={(d: any) => store.setVolume(d.value)}
            class="volume-slider"
          />
          <span class="volume-label">{store.volume}</span>
        </div>
      </div>
    )
  }
}
