/**
 * WhatsApp: the direct number, with the message already written for each context and language (the short
 * wa.me/message link doesn't take ?text). Every CTA opens the conversation warm: no "what do I write?".
 * Persuasion, not pressure.
 */
import { lang, onLang, type Lang } from './i18n'

export const WA_NUMBER = '573138721665'

const MESSAGES: Record<string, Record<Lang, string>> = {
  general: {
    es: 'Hola OCEAN 👋 Vengo de su web y quiero contarles un proyecto (software, IA o automatización).',
    en: "Hi OCEAN 👋 I came from your site and I'd like to tell you about a project (software, AI or automation).",
    pt: 'Olá OCEAN 👋 Vim do site e quero contar um projeto (software, IA ou automação).',
  },
  demo: {
    es: 'Hola OCEAN 👋 Quiero agendar una llamada para ver qué pueden automatizar en mi negocio. ¿Qué horarios tienen?',
    en: "Hi OCEAN 👋 I'd like to book a call to see what you can automate in my business. What times do you have?",
    pt: 'Olá OCEAN 👋 Quero agendar uma chamada para ver o que vocês podem automatizar no meu negócio. Quais horários vocês têm?',
  },
  agents: {
    es: 'Hola OCEAN 👋 Me interesan los agentes de WhatsApp con IA. ¿Cómo funcionarían para mi negocio?',
    en: "Hi OCEAN 👋 I'm interested in AI WhatsApp agents. How would they work for my business?",
    pt: 'Olá OCEAN 👋 Tenho interesse nos agentes de WhatsApp com IA. Como funcionariam para meu negócio?',
  },
  ads: {
    es: 'Hola OCEAN 👋 Quiero leads calificados con Meta Ads. ¿Me ayudan?',
    en: 'Hi OCEAN 👋 I want qualified leads with Meta Ads. Can you help?',
    pt: 'Olá OCEAN 👋 Quero leads qualificados com Meta Ads. Podem ajudar?',
  },
  ugc: {
    es: 'Hola OCEAN 👋 Quiero contenido para redes que se convierta en ventas. ¿Cómo trabajan?',
    en: 'Hi OCEAN 👋 I want social content that turns into sales. How do you work?',
    pt: 'Olá OCEAN 👋 Quero conteúdo para redes que vire vendas. Como vocês trabalham?',
  },
  web: {
    es: 'Hola OCEAN 👋 Quiero una web o tienda que cargue rápido y venda. ¿Me cuentan?',
    en: 'Hi OCEAN 👋 I want a fast website or store that sells. Can you tell me more?',
    pt: 'Olá OCEAN 👋 Quero um site ou loja rápida que venda. Podem me contar?',
  },
  software: {
    es: 'Hola OCEAN 👋 Mi equipo copia y pega datos todo el día. Quiero software a la medida con IA.',
    en: 'Hi OCEAN 👋 My team copies and pastes data all day. I want custom software with AI.',
    pt: 'Olá OCEAN 👋 Minha equipe copia e cola dados o dia todo. Quero software sob medida com IA.',
  },
  automation: {
    es: 'Hola OCEAN 👋 Quiero automatizar mi negocio (CRM, pagos, WhatsApp). ¿Por dónde empezamos?',
    en: 'Hi OCEAN 👋 I want to automate my business (CRM, payments, WhatsApp). Where do we start?',
    pt: 'Olá OCEAN 👋 Quero automatizar meu negócio (CRM, pagamentos, WhatsApp). Por onde começamos?',
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
