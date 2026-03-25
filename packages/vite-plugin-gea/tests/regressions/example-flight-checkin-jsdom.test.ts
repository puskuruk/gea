import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { installDom, flushMicrotasks } from '../../../../tests/helpers/jsdom-setup'
import { compileJsxComponent, loadRuntimeModules } from '../helpers/compile'
import { readExampleFile } from '../helpers/example-paths'

async function mountFlightCheckin(seed: string) {
  const [{ default: Component }] = await loadRuntimeModules(seed)
  const { default: store } = await import('../../../../examples/flight-checkin/src/flight-store.ts')
  const { default: optionsStore } = await import('../../../../examples/flight-checkin/src/options-store.ts')
  const { default: paymentStore } = await import('../../../../examples/flight-checkin/src/payment-store.ts')
  const { BASE_TICKET_PRICE, FLIGHT_INFO, LUGGAGE_OPTIONS, MEAL_OPTIONS, SEAT_OPTIONS } =
    await import('../../../../examples/flight-checkin/src/shared/flight-data.ts')

  const StepHeader = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/StepHeader.tsx'),
    '/virtual/examples/flight-checkin/StepHeader.jsx',
    'StepHeader',
    { Component },
  )
  const OptionItem = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/OptionItem.tsx'),
    '/virtual/examples/flight-checkin/OptionItem.jsx',
    'OptionItem',
    { Component },
  )
  const OptionStep = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/OptionStep.tsx'),
    '/virtual/examples/flight-checkin/OptionStep.jsx',
    'OptionStep',
    { Component, OptionItem, StepHeader },
  )
  const PaymentForm = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/PaymentForm.tsx'),
    '/virtual/examples/flight-checkin/PaymentForm.jsx',
    'PaymentForm',
    { Component },
  )
  const SummaryStep = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/SummaryStep.tsx'),
    '/virtual/examples/flight-checkin/SummaryStep.jsx',
    'SummaryStep',
    { Component, PaymentForm, StepHeader },
  )
  const BoardingPass = await compileJsxComponent(
    readExampleFile('flight-checkin/src/components/BoardingPass.tsx'),
    '/virtual/examples/flight-checkin/BoardingPass.jsx',
    'BoardingPass',
    { Component },
  )

  const FlightCheckin = await compileJsxComponent(
    readExampleFile('flight-checkin/src/flight-checkin.tsx'),
    '/virtual/examples/flight-checkin/FlightCheckin.jsx',
    'FlightCheckin',
    {
      Component,
      BoardingPass,
      OptionStep,
      SummaryStep,
      store,
      optionsStore,
      paymentStore,
      BASE_TICKET_PRICE,
      FLIGHT_INFO,
      LUGGAGE_OPTIONS,
      MEAL_OPTIONS,
      SEAT_OPTIONS,
    },
  )

  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = new FlightCheckin()
  app.render(root)
  await flushMicrotasks()
  return { app, root }
}

function optionByLabel(root: HTMLElement, labelSubstring: string): HTMLElement | null {
  for (const el of root.querySelectorAll('.option-item')) {
    if (el.textContent?.includes(labelSubstring)) return el as HTMLElement
  }
  return null
}

function setInputValue(el: HTMLInputElement, value: string) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('examples/flight-checkin in JSDOM (ported from flight-checkin.spec)', { concurrency: false }, () => {
  let restoreDom: () => void
  let root: HTMLElement
  let app: { dispose: () => void }

  beforeEach(async () => {
    restoreDom = installDom()
    const { default: store } = await import('../../../../examples/flight-checkin/src/flight-store.ts')
    store.startOver()
    const m = await mountFlightCheckin(`ex-fc-${Date.now()}-${Math.random()}`)
    app = m.app
    root = m.root
  })

  afterEach(async () => {
    app.dispose()
    await flushMicrotasks()
    root.remove()
    restoreDom()
  })

  it('step 1 luggage options', () => {
    assert.ok(root.querySelector('.flight-checkin'))
    assert.equal(root.querySelector('.step-header h2')?.textContent, 'Select Luggage')
    assert.equal(root.querySelectorAll('.option-item').length, 4)
  })

  it('advance to seat step', async () => {
    ;(root.querySelector('.nav-buttons .btn-primary') as HTMLButtonElement).click()
    await flushMicrotasks()
    assert.equal(root.querySelector('.step-header h2')?.textContent, 'Select Seat')
  })

  it('full flow reaches boarding pass', async () => {
    const checked = optionByLabel(root, '1 checked bag')
    assert.ok(checked)
    checked!.click()
    await flushMicrotasks()
    ;(root.querySelector('.nav-buttons .btn-primary') as HTMLButtonElement).click()
    await flushMicrotasks()

    const economyPlus = optionByLabel(root, 'Economy Plus')
    assert.ok(economyPlus)
    economyPlus!.click()
    await flushMicrotasks()
    ;(root.querySelector('.nav-buttons .btn-primary') as HTMLButtonElement).click()
    await flushMicrotasks()

    const chicken = optionByLabel(root, 'Chicken')
    assert.ok(chicken)
    chicken!.click()
    await flushMicrotasks()
    ;(root.querySelector('.nav-buttons .btn-primary') as HTMLButtonElement).click()
    await flushMicrotasks()

    assert.equal(root.querySelector('.step-header h2')?.textContent, 'Review & Payment')

    const nameInput = root.querySelector('input[placeholder="Passenger name"]') as HTMLInputElement
    const cardInput = root.querySelector('input[placeholder^="Card number"]') as HTMLInputElement
    const expiryInput = root.querySelector('input[placeholder="MM/YY"]') as HTMLInputElement
    setInputValue(nameInput, 'Jane Smith')
    setInputValue(cardInput, '4242424242424242')
    setInputValue(expiryInput, '1228')
    await flushMicrotasks()

    const payBtn = [...root.querySelectorAll('.payment-form .btn-primary')].find((b) =>
      b.textContent?.includes('Pay'),
    ) as HTMLButtonElement
    assert.ok(payBtn)
    payBtn.click()
    await flushMicrotasks()

    const viewPass = [...root.querySelectorAll('.nav-buttons .btn-primary')].find((b) =>
      b.textContent?.includes('View Boarding Pass'),
    ) as HTMLButtonElement
    assert.ok(viewPass)
    viewPass.click()
    await flushMicrotasks()

    assert.ok(root.querySelector('.boarding-pass'))
  })
})
