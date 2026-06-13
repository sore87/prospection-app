# Prospection AI

Application de séquences email B2B avec personnalisation par IA (Claude).

## Setup local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env
# → remplir .env avec tes clés

# 3. Créer la base de données locale
npx prisma db push
npx prisma generate

# 4. Lancer l'app
npm run dev
# → http://localhost:3000
```

## Structure

```
app/
  api/          → Routes backend (REST)
  dashboard/    → Vue globale
  prospects/    → Gestion des contacts
  campaigns/    → Séquences email
  validation/   → File d'approbation avant envoi
components/
  layout/       → Sidebar, Shell
  ui/           → Boutons, badges, modals
lib/
  prisma.ts         → Client DB singleton
  email-patterns.ts → Génération des variantes d'email
  claude.ts         → Wrapper API Anthropic
  mailer.ts         → Envoi SMTP via nodemailer
prisma/
  schema.prisma → Modèles de données
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | `file:./dev.db` en local, URL PostgreSQL en prod |
| `ANTHROPIC_API_KEY` | Clé API sur console.anthropic.com |
| `SMTP_HOST` | Ex: `smtp.gmail.com` |
| `SMTP_PORT` | Ex: `587` |
| `SMTP_USER` | Ton adresse email |
| `SMTP_PASS` | Mot de passe d'application Gmail |
| `SMTP_FROM_NAME` | Nom affiché dans les emails |
| `SMTP_FROM_EMAIL` | Adresse expéditeur |

## Déploiement

### Vercel (frontend + API)
```bash
npm i -g vercel
vercel --prod
# Ajouter toutes les variables d'env dans le dashboard Vercel
```

### Render (base de données PostgreSQL)
1. Créer un service "PostgreSQL" sur render.com
2. Copier l'URL de connexion dans `DATABASE_URL` sur Vercel
3. Changer le `provider` dans `prisma/schema.prisma` : `sqlite` → `postgresql`
4. Redéployer
