import { Children } from 'react'

export default function Marquee({
  children,
  reverse = false,
  duration = 30,
  pauseOnHover = false,
}) {
  const track = Children.toArray(children)

  return (
    <div className={`marquee${pauseOnHover ? ' marquee--pause' : ''}`}>
      <div
        className="marquee__track"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {track.map((node, i) => (
          <div className="marquee__group" key={i} aria-hidden={i > 0}>
            {node}
          </div>
        ))}
        {track.map((node, i) => (
          <div className="marquee__group" key={`b-${i}`} aria-hidden="true">
            {node}
          </div>
        ))}
      </div>
    </div>
  )
}