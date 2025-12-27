# Checklist de Validation PROD - AppShell

## ✅ 1. Vérifier le Commit SHA en Production

**Où vérifier :**
- **Desktop** : Badge visible dans la sidebar (en haut, sous "PULSE")
- **Mobile** : Badge visible dans la topbar (à droite)
- **Desktop topbar** : Badge visible en haut à droite

**Format attendu :**
```
production • 5cbe67d
```

**Action :**
1. Ouvrir `/dashboard` en production
2. Vérifier que le badge affiche `production • [commit-sha]`
3. Comparer avec `git log -1 --oneline` local
4. ✅ **Si identique** : Le bon commit est déployé
5. ❌ **Si différent** : Voir section "Si Vercel affiche encore l'ancien UI"

---

## ✅ 2. Vérifier la Sidebar (Desktop)

**Test :**
1. Ouvrir `/dashboard` en production (écran ≥1024px)
2. Vérifier la sidebar à gauche contient :
   - ✅ Logo "PULSE" en haut
   - ✅ Badge "production • [sha]" sous le logo
   - ✅ Dropdown d'organisation
   - ✅ Menu avec :
     - 📊 Dashboard
     - ☁️ **Cloud Accounts** ← Test de validation
     - 🔔 **Alerts** ← Test de validation
     - 🔔 Notifications
     - 👥 Team
     - 💳 Billing (si org active)
   - ✅ Bouton "Sync Now" en bas (si AWS actif)
   - ✅ Bouton "Logout" en bas

**Résultat attendu :**
- Sidebar fixe à gauche (ne scroll pas avec le contenu)
- Menu cliquable et navigation fonctionnelle
- Badge visible et lisible

---

## ✅ 3. Vérifier les Pages Globales

### `/accounts`
1. Ouvrir `/accounts` en production
2. ✅ Sidebar visible à gauche (desktop) ou hamburger menu (mobile)
3. ✅ Badge de commit visible
4. ✅ Liste des comptes cloud groupés par organisation
5. ✅ Navigation vers `/dashboard` fonctionne

### `/alerts`
1. Ouvrir `/alerts` en production
2. ✅ Sidebar visible
3. ✅ Badge de commit visible
4. ✅ Liste des alertes groupées par organisation
5. ✅ Bouton "+ Create Alert" fonctionne

### `/notifications`
1. Ouvrir `/notifications` en production
2. ✅ Sidebar visible
3. ✅ Badge de commit visible
4. ✅ Liste des notifications affichée
5. ✅ Navigation fonctionne

### `/team`
1. Ouvrir `/team` en production
2. ✅ Sidebar visible
3. ✅ Badge de commit visible
4. ✅ Gestion d'équipe affichée
5. ✅ Navigation fonctionne

---

## ✅ 4. Vérifier le Hamburger Menu (Mobile)

**Test :**
1. Ouvrir `/dashboard` en production (écran <1024px)
2. ✅ Topbar visible en haut avec :
   - Hamburger menu (☰) à gauche
   - Logo "PULSE" au centre
   - Badge de commit à droite
   - Bouton "Sync Now" (si AWS actif)
   - Bouton "Logout"
3. Cliquer sur hamburger menu
4. ✅ Sidebar slide depuis la gauche
5. ✅ Menu contient les mêmes items que desktop
6. ✅ Cliquer sur un item → navigation + fermeture du menu
7. ✅ Cliquer en dehors → fermeture du menu

---

## ✅ 5. Si Vercel affiche encore l'ancien UI

### A. Vérifier le Commit SHA
1. Comparer le badge en prod vs `git log -1 --oneline` local
2. Si différent → Vercel n'a pas déployé le dernier commit

### B. Actions Correctives

**Option 1 : Redeploy manuel**
1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet
3. Aller dans "Deployments"
4. Trouver le dernier deployment
5. Cliquer sur "..." → "Redeploy"
6. Attendre 2-3 minutes
7. Vérifier à nouveau

**Option 2 : Vérifier la branch**
1. Vercel Dashboard → Settings → Git
2. Vérifier "Production Branch" = `main`
3. Si différent → changer vers `main`
4. Redeploy

**Option 3 : Clear cache navigateur**
1. Hard refresh : `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
2. Ou ouvrir en navigation privée
3. Vérifier à nouveau

**Option 4 : Vérifier auto-deploy**
1. Vercel Dashboard → Settings → Git
2. Vérifier "Auto-deploy" est activé
3. Vérifier les webhooks GitHub sont configurés
4. Si problème → reconnecter le repo

### C. Validation après correction
1. Vérifier le badge de commit affiche le bon SHA
2. Vérifier la sidebar contient "Cloud Accounts" et "Alerts"
3. Tester la navigation entre les pages
4. ✅ **Si OK** : Le déploiement est correct

---

## Résumé Rapide

**5 Points de Validation :**
1. ✅ Badge commit SHA visible et correct
2. ✅ Sidebar desktop avec "Cloud Accounts" et "Alerts"
3. ✅ Pages `/accounts`, `/alerts`, `/notifications`, `/team` fonctionnent
4. ✅ Hamburger menu mobile fonctionne
5. ✅ Si problème → Redeploy + Clear cache

**URLs à tester :**
- `/dashboard` - Sidebar + badge
- `/accounts` - Sidebar + badge
- `/alerts` - Sidebar + badge
- `/notifications` - Sidebar + badge
- `/team` - Sidebar + badge

**Test de validation final :**
> Si la sidebar contient "Cloud Accounts" et "Alerts", le fix est OK ✅



