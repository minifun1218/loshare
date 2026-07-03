import ZineParticles from './ZineParticles'

export default function ThemeDecor({ theme }) {
  if (theme === 'minimal') {
    return (
      <>
        <div className="minimal-decor" aria-hidden="true" />
      </>
    )
  }

  if (theme === 'glass') {
    return (
      <>
        <div className="glass-orb glass-orb--01" aria-hidden="true" />
        <div className="glass-orb glass-orb--02" aria-hidden="true" />
        <div className="glass-orb glass-orb--03" aria-hidden="true" />
      </>
    )
  }

  if (theme === 'editorial') {
    return (
      <>
        <span className="zine-decor-num zine-decor-num--01" aria-hidden="true">02</span>
        <span className="zine-decor-num zine-decor-num--02" aria-hidden="true">N°</span>
        <span className="zine-decor-num zine-decor-num--03" aria-hidden="true">31</span>
      </>
    )
  }

  return <ZineParticles count={48} />
}