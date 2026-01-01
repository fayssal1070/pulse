# Limitations du plan Vercel gratuit

## Problème résolu

**Cause :** Le plan gratuit Vercel limite les requêtes cron à **1 par jour**.

**Symptôme :** Les déploiements automatiques ne se déclenchaient pas, même si :
- Les workflows GitHub Actions réussissaient
- Le Deploy Hook était correctement configuré
- Les secrets GitHub étaient bien définis

**Solution :** Passer au plan **Vercel Pro** qui permet plus de requêtes cron.

## Limites du plan gratuit Vercel

- **Cron Jobs :** 1 requête par jour maximum
- **Builds :** Limité
- **Bandwidth :** 100 GB/mois
- **Function Execution Time :** 10 secondes (Hobby) vs 60 secondes (Pro)

## Plan Pro Vercel

- **Cron Jobs :** Illimité
- **Builds :** Plus de builds par mois
- **Bandwidth :** 1 TB/mois
- **Function Execution Time :** 60 secondes

## Vérification

Après passage au plan Pro :
- ✅ Les déploiements automatiques fonctionnent
- ✅ Les workflows GitHub Actions déclenchent bien les déploiements Vercel
- ✅ Le Deploy Hook fonctionne correctement

## Note

Si des déploiements ne se déclenchent pas malgré une configuration correcte, vérifier :
1. Le plan Vercel (gratuit vs Pro)
2. Les limites de cron jobs
3. Les quotas de builds


