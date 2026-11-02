/**
 * WhatsApp: the direct number, with the message already written for each context and language (the short
 * wa.me/message link doesn't take ?text). Every CTA opens the conversation warm: no "what do I write?".
 * Persuasion, not pressure.
 */
import { lang, onLang, type Lang } from './i18n'

export const WA_NUMBER = '573138721665'

const MESSAGES: Record<string, Record<Lang, string>> = {
  general: {
    es: 'Hola Ocean 👋 Vengo de su web y quiero saber cómo pueden automatizar mi negocio.',
    en: "Hi Ocean 👋 I came from your site and I'd like to know how you can automate my business.",
    pt: 'Olá Ocean 👋 Vim do site e quero saber como podem automatizar meu negócio.',
  },
  demo: {
    es: 'Hola Ocean 👋 Quiero mi demo. ¿Me cuentan cómo empezamos?',
    en: 'Hi Ocean 👋 I want my demo. How do we get started?',
    pt: 'Olá Ocean 👋 Quero minha demo. Como começamos?',
  },
  agents: {
    es: 'Hola Ocean 👋 Me interesan los agentes de WhatsApp con IA. ¿Cómo funcionarían para mi negocio?',
    en: "Hi Ocean 👋 I'm interested in AI WhatsApp agents. How would they work for my business?",
    pt: 'Olá Ocean 👋 Tenho interesse nos agentes de WhatsApp com IA. Como funcionariam para meu negócio?',
  },
  ads: {
    es: 'Hola Ocean 👋 Quiero leads calificados con Meta Ads. ¿Me ayudan?',
    en: 'Hi Ocean 👋 I want qualified leads with Meta Ads. Can you help?',
    pt: 'Olá Ocean 👋 Quero leads qualificados com Meta Ads. Podem ajudar?',
  },
  ugc: {
    es: 'Hola Ocean 👋 Quiero contenido para redes que se convierta en ventas. ¿Cómo trabajan?',
    en: 'Hi Ocean 👋 I want social content that turns into sales. How do you work?',
    pt: 'Olá Ocean 👋 Quero conteúdo para redes que vire vendas. Como vocês trabalham?',
  },
  web: {
    es: 'Hola Ocean 👋 Quiero una web o tienda que cargue rápido y venda. ¿Me cuentan?',
    en: 'Hi Ocean 👋 I want a fast website or store that sells. Can you tell me more?',
    pt: 'Olá Ocean 👋 Quero um site ou loja rápida que venda. Podem me contar?',
  },
  software: {
    es: 'Hola Ocean 👋 Mi equipo copia y pega datos todo el día. Quiero software a la medida con IA.',
    en: 'Hi Ocean 👋 My team copies and pastes data all day. I want custom software with AI.',
    pt: 'Olá Ocean 👋 Minha equipe copia e cola dados o dia todo. Quero software sob medida com IA.',
  },
  automation: {
    es: 'Hola Ocean 👋 Quiero automatizar mi negocio (CRM, pagos, WhatsApp). ¿Por dónde empezamos?',
    en: 'Hi Ocean 👋 I want to automate my business (CRM, payments, WhatsApp). Where do we start?',
    pt: 'Olá Ocean 👋 Quero automatizar meu negócio (CRM, pagamentos, WhatsApp). Por onde começamos?',
  },
}

export function waLink(context = 'general', text?: string): string {
  const msg = text ?? (MESSAGES[context] ?? MESSAGES.general)[lang()]
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

function refresh(root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('a[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.wa || 'general')
  })
}

export function initWhatsApp(): void {
  refresh()
  onLang(() => refresh())
}
