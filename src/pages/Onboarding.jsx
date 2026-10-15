import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, GOAL_OPTIONS, KNOWLEDGE_LEVELS, LEARNING_STYLES, INVOLVEMENT_LEVELS } from '../data/demo.js'

function MultiSelect({ options, selected, onToggle, cols = 2 }) {
  return (
    <div className={`profile-options cols-${cols}`}>
      {options.map((o) => (
        <label key={o.id} className={`profile-option ${selected.includes(o.id) ? 'on' : ''}`}>
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() => onToggle(o.id)}
            className="sr-only"
          />
          {o.icon && <span className="profile-option-icon">{o.icon}</span>}
          <span className="profile-option-label">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function RadioSelect({ options, selected, onSelect }) {
  return (
    <div className="profile-options cols-3">
      {options.map((o) => (
        <label key={o.id} className={`profile-option ${selected === o.id ? 'on' : ''}`}>
          <input
            type="radio"
            name="radio-select"
            checked={selected === o.id}
            onChange={() => onSelect(o.id)}
            className="sr-only"
          />
          <span className="profile-option-label">{o.label}</span>
          {o.description && <span className="profile-option-desc muted">{o.description}</span>}
        </label>
      ))}
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const { state, dispatch } = useDemo()
  const { profile } = state
  const [step, setStep] = useState(0)

  const update = (patch) => dispatch({ type: 'profile', profile: patch })

  const steps = [
    {
      id: 'goals',
      heading: 'What are your financial goals?',
      sub: 'Select all that apply. We\'ll personalize your scenarios and recommendations.',
      content: (
        <MultiSelect
          options={GOAL_OPTIONS}
          selected={profile.goals}
          onToggle={(id) =>
            update({
              goals: profile.goals.includes(id)
                ? profile.goals.filter((g) => g !== id)
                : [...profile.goals, id],
            })
          }
        />
      ),
    },
    {
      id: 'knowledge',
      heading: 'How would you describe your financial knowledge?',
      sub: 'This helps us explain concepts at the right level.',
      content: (
        <RadioSelect
          options={KNOWLEDGE_LEVELS}
          selected={profile.knowledge}
          onSelect={(id) => update({ knowledge: id })}
        />
      ),
    },
    {
      id: 'style',
      heading: 'How do you prefer to learn?',
      sub: 'We\'ll suggest the right mix of scenarios and explanations.',
      content: (
        <MultiSelect
          options={LEARNING_STYLES}
          selected={profile.learningStyle}
          onToggle={(id) =>
            update({
              learningStyle: profile.learningStyle.includes(id)
                ? profile.learningStyle.filter((s) => s !== id)
                : [...profile.learningStyle, id],
            })
          }
          cols={2}
        />
      ),
    },
    {
      id: 'involvement',
      heading: 'How involved do you want to become?',
      sub: 'This helps set the right expectations for your Trust Ladder progression.',
      content: (
        <RadioSelect
          options={INVOLVEMENT_LEVELS}
          selected={profile.involvement}
          onSelect={(id) => update({ involvement: id })}
        />
      ),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  const finish = () => {
    dispatch({ type: 'profile', profile: { onboarded: true } })
    onDone?.()
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Heirloom</span>
          </div>
          <div className="onboarding-progress">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`onboarding-dot ${i <= step ? 'on' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <div className="onboarding-body">
          <p className="onboarding-step-label">Step {step + 1} of {steps.length}</p>
          <h2>{current.heading}</h2>
          <p className="muted">{current.sub}</p>
          {current.content}
        </div>

        <div className="onboarding-footer">
          <button
            className="btn"
            onClick={() => (step > 0 ? setStep(step - 1) : finish())}
          >
            {step > 0 ? 'Back' : 'Skip for now'}
          </button>
          <button
            className="btn primary"
            onClick={() => (isLast ? finish() : setStep(step + 1))}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileEditor({ onClose }) {
  const { state, dispatch } = useDemo()
  const { profile } = state
  const update = (patch) => dispatch({ type: 'profile', profile: patch })

  return (
    <div className="profile-editor card">
      <div className="profile-editor-header">
        <h2>Edit your profile</h2>
        <button className="text-btn" onClick={onClose}>Close</button>
      </div>

      <section className="profile-section">
        <h3>Financial goals</h3>
        <MultiSelect
          options={GOAL_OPTIONS}
          selected={profile.goals}
          onToggle={(id) =>
            update({
              goals: profile.goals.includes(id)
                ? profile.goals.filter((g) => g !== id)
                : [...profile.goals, id],
            })
          }
        />
      </section>

      <section className="profile-section">
        <h3>Financial knowledge level</h3>
        <RadioSelect
          options={KNOWLEDGE_LEVELS}
          selected={profile.knowledge}
          onSelect={(id) => update({ knowledge: id })}
        />
      </section>

      <section className="profile-section">
        <h3>Preferred learning style</h3>
        <MultiSelect
          options={LEARNING_STYLES}
          selected={profile.learningStyle}
          onToggle={(id) =>
            update({
              learningStyle: profile.learningStyle.includes(id)
                ? profile.learningStyle.filter((s) => s !== id)
                : [...profile.learningStyle, id],
            })
          }
          cols={2}
        />
      </section>

      <section className="profile-section">
        <h3>Desired involvement level</h3>
        <RadioSelect
          options={INVOLVEMENT_LEVELS}
          selected={profile.involvement}
          onSelect={(id) => update({ involvement: id })}
        />
      </section>
    </div>
  )
}
