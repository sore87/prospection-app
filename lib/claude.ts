import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ProspectContext {
  firstName: string
  lastName: string
  company: string
  position: string
  industry?: string
  companySize?: string
  location?: string
  linkedinUrl?: string
}

export interface SequenceContext {
  stepNumber: number      // 1, 2, 3, 4
  totalSteps: number      // nombre total d'étapes
  dayGap: number          // J+0, J+4, J+8...
  product: string         // ex: "TSplus Remote Access"
  targetDescription: string // ex: "revendeurs et prestataires IT qui accompagnent des TPE/PME"
  valueProposition: string  // ex: "publier des applications Windows depuis un serveur existant"
  senderName: string
  senderPosition: string
  senderCompany: string
}

export async function generateEmail(
  prospect: ProspectContext,
  sequence: SequenceContext
): Promise<{ subject: string; body: string }> {

  const stepContext = getStepContext(sequence.stepNumber, sequence.totalSteps)

  const prompt = `Tu es un expert en prospection B2B française. Tu écris un email de prospection commerciale pour ${sequence.senderName}, ${sequence.senderPosition} chez ${sequence.senderCompany}.

PROSPECT :
- Prénom : ${prospect.firstName}
- Nom : ${prospect.lastName}
- Poste : ${prospect.position}
- Entreprise : ${prospect.company}
${prospect.industry ? `- Secteur : ${prospect.industry}` : ""}
${prospect.companySize ? `- Taille entreprise : ${prospect.companySize} employés` : ""}
${prospect.location ? `- Localisation : ${prospect.location}` : ""}

CONTEXTE DE LA SÉQUENCE :
- Produit : ${sequence.product}
- Cible : ${sequence.targetDescription}
- Proposition de valeur : ${sequence.valueProposition}
- Étape ${sequence.stepNumber}/${sequence.totalSteps} (J+${sequence.dayGap})
- Objectif de cet email : ${stepContext.goal}
- Ton : ${stepContext.tone}

RÈGLES IMPÉRATIVES :
1. L'email doit donner l'impression que tu as visité le site de ${prospect.company} et que tu connais leur activité
2. Adapte l'angle selon le poste "${prospect.position}" — un gérant ne reçoit pas le même email qu'un responsable IT
3. Longueur : 120-180 mots maximum, pas plus
4. Pas de bullet points ni de listes — uniquement des paragraphes courts
5. Termine par UNE seule question ouverte concrète
6. Signe avec : ${sequence.senderName}
7. Pas de formule générique type "J'espère que vous allez bien"
8. Chaque email doit sembler écrit spécifiquement pour ${prospect.firstName} chez ${prospect.company}
9. Langue : français professionnel mais direct, pas trop formel

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication :
{
  "subject": "objet de l'email (max 8 mots, pas de majuscules inutiles)",
  "body": "corps de l'email complet avec signature"
}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const cleaned = text.replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    // fallback si le JSON est mal formé
    return {
      subject: `Message pour ${prospect.firstName}`,
      body: text,
    }
  }
}

function getStepContext(step: number, total: number) {
  if (step === 1) return {
    goal: "Premier contact — piquer la curiosité, montrer qu'on connaît leur contexte, obtenir un échange",
    tone: "Direct, professionnel, centré sur leur problématique — pas sur le produit",
  }
  if (step === total) return {
    goal: "Dernier email de la séquence — breakup email, clore proprement ou obtenir une réponse définitive",
    tone: "Bref, sans pression, laisser la porte ouverte",
  }
  if (step === 2) return {
    goal: "Relance — approcher sous un angle différent, approfondir un cas d'usage concret",
    tone: "Légèrement plus direct, référencer implicitement le premier email sans s'y attarder",
  }
  return {
    goal: "Relance intermédiaire — apporter un élément concret nouveau, cas client ou exemple",
    tone: "Concret, factuel, court",
  }
}
