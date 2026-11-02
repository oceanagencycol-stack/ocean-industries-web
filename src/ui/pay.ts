/**
 * Pay or deposit for a service, with Wompi (card, PSE, Nequi, Bancolombia). An open amount: the client writes what
 * they pay for the agreed service; the total shows the fee (2.95 % + $700) and its VAT (19 % on the fee) before paying.
 *
 * The money rules (ocean-pagos): the card never touches Ocean (Wompi's widget, loaded only when paying); the
 * integrity signature comes from /api/pago-wompi (the secret lives in Vercel); the charge is always in COP (USD is
 * shown at today's rate); and the redirect back is not a confirmation: only Wompi's approval says the payment went
 * through, so the page says so honestly.
 */
import { onLang, t } from './i18n'
import { toast } from './toast'
import { waLink } from './wa'
import { track } from './analytics'
import { sound } from '../core/audio'

const WOMPI_PUBLIC_KEY = 'pub_prod_TMaELJ4lqpsANIDgLEKO75nBdapSuZf0' // public key: fine in the frontend
const SIGN_ENDPOINT = '/api/pago-wompi'
const MIN_COP = 1500

type Cur = 'COP' | 'USD'

interface WompiResult {
  transaction?: { status?: string; id?: string }
}
type WidgetCtor = new (o: Record<string, unknown>) => { open: (cb: (r: WompiResult) => void) => void }

let wompiP: Promise<void> | null = null
function loadWompi(): Promise<void> {
  if ((window as Window & { WidgetCheckout?: WidgetCtor }).WidgetCheckout) return Promise.resolve()
  if (wompiP) return wompiP
  wompiP = new Promise((ok, bad) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.wompi.co/widget.js'
    s.onload = () => ok()
    s.onerror = () => {
      wompiP = null
      bad(new Error('wompi'))
    }
    document.head.appendChild(s)
  })
  return wompiP
}

export interface PayHooks {
  /** a payment was approved in the widget (the sea glows green) */
  onApproved?: () => void
}

export function initPay(hooks: PayHooks = {}): void {
  const form = document.getElementById('payForm') as HTMLFormElement | null
  if (!form) return
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
  const amount = $<HTMLInputElement>('payAmount')
  const btn = $<HTMLButtonElement>('payBtn')
  const btnLabel = $<HTMLElement>('payBtnLabel')
  const curBtns = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-cur]'))
  let cur: Cur = 'COP'
  let trm = 3900 // a fallback; the day's rate replaces it
  let state = { base: 0, fee: 0, iva: 0, total: 0 }
  let trmP: Promise<void> | null = null
  const loadTRM = () =>
    (trmP ??= fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((d: { rates?: { COP?: number } }) => {
        if (d?.rates?.COP) trm = d.rates.COP
      })
      .catch(() => {}))

  const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')} COP`
  const fmtUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

  function update(): void {
    const v = parseFloat(amount.value) || 0
    const base = cur === 'USD' ? v * trm : v
    const fee = base > 0 ? base * 0.0295 + 700 : 0
    const iva = fee * 0.19
    const total = base + fee + iva
    state = { base, fee, iva, total }
    const f = cur === 'USD' ? fmtUSD : fmtCOP
    const div = cur === 'USD' ? trm : 1
    $('sumBase').textContent = f(base / div)
    $('sumFee').textContent = f(fee / div)
    $('sumIva').textContent = f(iva / div)
    $('sumTotal').textContent = f(total / div)
    const cop = $('sumCop')
    if (cur === 'USD' && total > 0) {
      cop.hidden = false
      cop.textContent = `${t({ es: 'Se cobra', en: 'Charged', pt: 'Cobrado' })}: ${fmtCOP(total)} (TRM ${Math.round(trm).toLocaleString('es-CO')})`
    } else cop.hidden = true
    btn.disabled = cur === 'USD' ? v < 1 : v < MIN_COP
  }

  function setCur(c: Cur): void {
    cur = c
    curBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cur === c)))
    const label = $('amountLabel')
    label.textContent = c === 'USD'
      ? t({ es: 'Monto a pagar (USD)', en: 'Amount (USD)', pt: 'Valor (USD)' })
      : t({ es: 'Monto a pagar (COP)', en: 'Amount (COP)', pt: 'Valor (COP)' })
    $('usdNote').hidden = c !== 'USD'
    amount.min = c === 'USD' ? '1' : String(MIN_COP)
    amount.step = c === 'USD' ? '1' : '1000'
    if (c === 'USD') void loadTRM().then(update)
    update()
  }

  curBtns.forEach((b) => b.addEventListener('click', () => setCur(b.dataset.cur as Cur)))
  amount.addEventListener('input', update)
  onLang(() => setCur(cur))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = ($<HTMLInputElement>('payName').value || '').trim()
    const email = ($<HTMLInputElement>('payEmail').value || '').trim()
    const concept = ($<HTMLInputElement>('payConcept').value || '').trim() || 'Pago de servicio Ocean'
    if (state.total < MIN_COP) {
      toast(t({ es: 'El monto es muy bajo.', en: 'The amount is too low.', pt: 'O valor é muito baixo.' }), 'err')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast(t({ es: 'Escribe tu correo para enviarte el comprobante.', en: 'Enter your email so we can send the receipt.', pt: 'Digite seu email para enviarmos o comprovante.' }), 'err')
      $<HTMLInputElement>('payEmail').focus()
      return
    }
    const amountInCents = Math.round(state.total * 100) // always COP
    const reference = `OCEAN-${Date.now()}`
    btn.disabled = true
    btnLabel.textContent = t({ es: 'Preparando…', en: 'Preparing…', pt: 'Preparando…' })
    track('payment_start', { currency: cur })
    try {
      await loadWompi()
      const res = await fetch(SIGN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, amountInCents, currency: 'COP' }),
      })
      if (!res.ok) throw new Error(`sign ${res.status}`)
      const data = (await res.json()) as { signature?: string }
      if (!data.signature) throw new Error('no signature')
      const Widget = (window as Window & { WidgetCheckout?: WidgetCtor }).WidgetCheckout!
      const checkout = new Widget({
        currency: 'COP',
        amountInCents,
        reference,
        publicKey: WOMPI_PUBLIC_KEY,
        signature: { integrity: data.signature },
        redirectUrl: `${location.origin}/?pago=ok`,
        customerData: { email, fullName: name },
      })
      checkout.open((r) => {
        const tx = r.transaction
        if (tx?.status === 'APPROVED') {
          toast(t({ es: `¡Pago aprobado! Gracias${name ? `, ${name}` : ''}.`, en: `Payment approved! Thank you${name ? `, ${name}` : ''}.`, pt: `Pagamento aprovado! Obrigado${name ? `, ${name}` : ''}.` }), 'ok')
          sound.play('result')
          hooks.onApproved?.()
          track('payment_approved', { currency: cur })
        } else if (tx?.status) {
          toast(t({ es: 'El pago no se aprobó. Puedes intentarlo de nuevo o escribirnos por WhatsApp.', en: "The payment wasn't approved. You can try again or message us on WhatsApp.", pt: 'O pagamento não foi aprovado. Você pode tentar de novo ou falar conosco no WhatsApp.' }), 'err')
        }
      })
    } catch {
      toast(t({ es: 'No pudimos abrir el pago. Te llevamos a WhatsApp para terminarlo.', en: "We couldn't open the payment. We'll take you to WhatsApp to finish it.", pt: 'Não conseguimos abrir o pagamento. Vamos te levar ao WhatsApp para concluir.' }), 'err')
      const msg = t({ es: 'Hola Ocean, quiero pagar ', en: 'Hi Ocean, I want to pay ', pt: 'Olá Ocean, quero pagar ' }) + `${fmtCOP(state.total)} (${concept})`
      window.open(waLink('general', msg), '_blank', 'noopener')
    } finally {
      btn.disabled = false
      btnLabel.textContent = t({ es: 'Pagar con Wompi', en: 'Pay with Wompi', pt: 'Pagar com Wompi' })
    }
  })

  setCur('COP')

  // back from Wompi's page: the redirect is not the confirmation (the webhook is), so we say exactly that
  const q = new URLSearchParams(location.search)
  if (q.get('pago') === 'ok') {
    window.setTimeout(
      () =>
        toast(
          t({
            es: 'Volviste de Wompi. Si el pago fue aprobado, te llega la confirmación por correo.',
            en: "You're back from Wompi. If the payment was approved, the confirmation arrives by email.",
            pt: 'Você voltou da Wompi. Se o pagamento foi aprovado, a confirmação chega por email.',
          }),
          'ok',
        ),
      900,
    )
    history.replaceState(null, '', location.pathname + location.hash)
  }
}
