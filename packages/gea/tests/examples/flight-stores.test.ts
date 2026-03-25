import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OptionsStore } from '../../../../examples/flight-checkin/src/options-store'
import { PaymentStore } from '../../../../examples/flight-checkin/src/payment-store'
import { FlightStore } from '../../../../examples/flight-checkin/src/flight-store'
import optionsStore from '../../../../examples/flight-checkin/src/options-store'
import paymentStore from '../../../../examples/flight-checkin/src/payment-store'

describe('examples/flight-checkin stores', () => {
  it('OptionsStore prices and reset', () => {
    const o = new OptionsStore()
    assert.ok(o.luggagePrice >= 0)
    o.setLuggage('checked-1')
    assert.ok(o.luggagePrice > 0)
    o.reset()
    assert.equal(o.luggage, 'carry-on')
  })

  it('PaymentStore formatters and processPayment', () => {
    const p = new PaymentStore()
    assert.equal(p.formatCardNumber('1234-5678'), '1234 5678')
    p.setPassengerName({ target: { value: 'Jane' } } as any)
    p.processPayment()
    assert.equal(p.paymentComplete, true)
  })

  it('FlightStore step and boarding pass', () => {
    optionsStore.reset()
    paymentStore.reset()
    const f = new FlightStore()
    assert.equal(f.step, 1)
    f.setStep(5)
    assert.ok(f.boardingPass)
    assert.match(f.boardingPass!.confirmationCode, /^SK/)
    f.startOver()
    assert.equal(f.step, 1)
    assert.equal(f.boardingPass, null)
  })
})
