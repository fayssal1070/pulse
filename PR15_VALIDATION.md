# PR15 Validation Checklist

## AI Providers Router - Connect OpenAI/Anthropic/xAI/Google/Mistral

### A) Prisma + Migration Safe

1. ✅ **Modèles Prisma**
   - [ ] `AiProviderConnection` créé avec champs: id, orgId, provider (enum), name, status (enum), encryptedApiKey, keyLast4
   - [ ] `AiModelRoute` créé avec champs: id, orgId, provider (enum), model, enabled, priority, maxCostPerReqEUR
   - [ ] Contraintes uniques: `@@unique([orgId, provider, name])` sur AiProviderConnection
   - [ ] Contraintes uniques: `@@unique([orgId, provider, model])` sur AiModelRoute
   - [ ] Relations FK vers Organization avec `onDelete: Cascade`

2. ✅ **Migration Safe**
   - [ ] Migration SQL créée dans `prisma/migrations/20250131000000_add_ai_providers_router/`
   - [ ] Utilise `CREATE TABLE IF NOT EXISTS` pour tables
   - [ ] Utilise `DO $$ ... END $$` pour contraintes uniques et FK
   - [ ] Utilise `CREATE INDEX IF NOT EXISTS` pour index
   - [ ] Migration peut être exécutée plusieurs fois sans erreur

### B) Chiffrement

3. ✅ **Crypto Module**
   - [ ] `lib/ai/providers/crypto.ts` créé
   - [ ] `encryptSecret(plain: string)` retourne `{ ciphertext, last4 }`
   - [ ] `decryptSecret(ciphertext: string)` retourne la clé déchiffrée
   - [ ] Réutilise `lib/notifications/encryption.ts` (AES-GCM)
   - [ ] Clé dérivée de AUTH_SECRET (+ INTEGRATIONS_ENC_KEY si présent)
   - [ ] Ne renvoie JAMAIS la clé en clair après création

### C) API Admin (RBAC admin only)

4. ✅ **Routes Providers**
   - [ ] `GET /api/admin/ai/providers` liste connections (sans clé)
   - [ ] `POST /api/admin/ai/providers` crée connection avec `{provider,name,apiKey}` => chiffre et stocke
   - [ ] `PATCH /api/admin/ai/providers/[id]` permet rename, enable/disable, rotateKey
   - [ ] `DELETE /api/admin/ai/providers/[id]` supprime connection
   - [ ] Protection RBAC: `requireAdmin()` sur toutes les routes
   - [ ] Multi-tenant strict: vérifie `orgId` scoping

5. ✅ **Routes Model Routes**
   - [ ] `GET /api/admin/ai/routes` liste routes
   - [ ] `POST /api/admin/ai/routes` crée route `{provider, model, priority, enabled}`
   - [ ] `PATCH /api/admin/ai/routes/[id]` permet modifier enabled, priority, maxCostPerReqEUR
   - [ ] `DELETE /api/admin/ai/routes/[id]` supprime route
   - [ ] Vérifie que provider connection ACTIVE existe avant création route
   - [ ] Protection RBAC: `requireAdmin()` sur toutes les routes

6. ✅ **Test Provider**
   - [ ] `POST /api/admin/ai/providers/test` avec `{ providerConnectionId }`
   - [ ] Déchiffre key et fait test réel minimal avec timeout (10s)
   - [ ] Tests par provider:
     - OpenAI: call minimal chat completion
     - Anthropic: messages minimal
     - xAI: request minimal compatible OpenAI-like
     - Google: minimal generateContent
     - Mistral: minimal chat
   - [ ] Retourne `{ ok: true, latencyMs }` ou `{ ok: false, error }`
   - [ ] Erreurs claires et sanitized (pas d'API keys exposées)

### D) Router + Intégration Gateway

7. ✅ **Provider Implementations**
   - [ ] `lib/ai/providers/openai.ts` implémente callOpenAI()
   - [ ] `lib/ai/providers/anthropic.ts` implémente callAnthropic()
   - [ ] `lib/ai/providers/xai.ts` implémente callXAI()
   - [ ] `lib/ai/providers/google.ts` implémente callGoogle()
   - [ ] `lib/ai/providers/mistral.ts` implémente callMistral()
   - [ ] Tous retournent format normalisé: `{ text, tokensIn, tokensOut, latencyMs, provider, model, raw? }`

8. ✅ **Router**
   - [ ] `lib/ai/providers/router.ts` implémente `routeAiRequest()`
   - [ ] Trouve AiModelRoute active correspondant au model (org-scoped), tri par priority
   - [ ] Trouve AiProviderConnection ACTIVE du provider
   - [ ] Déchiffre la key
   - [ ] Appelle le provider approprié
   - [ ] Retourne réponse normalisée
   - [ ] Si aucun provider configuré => erreur claire: "No provider connected for model X. Go to /admin/integrations/ai"

9. ✅ **Intégration Gateway**
   - [ ] `lib/ai/gateway.ts` remplace `callOpenAI()` direct par `routeProviderRequest()`
   - [ ] Fallback à `OPENAI_API_KEY` env var si aucun provider configuré (backward compatibility)
   - [ ] Conserve pricing + CostEvent + AiRequestLog + budgets/policies
   - [ ] Si aucun provider configuré => 400 avec message clair
   - [ ] Pas de breaking changes: routes existantes fonctionnent toujours

### E) UI Admin

10. ✅ **Page `/admin/integrations/ai`**
    - [ ] Section "Connect Provider" avec formulaire (provider, name, apiKey) + Save
    - [ ] Liste providers connectés avec boutons Test/Enable/Disable/Delete
    - [ ] Table Model Routes (provider/model/enabled/priority) + "Add route"
    - [ ] Bouton "Add common models" pour presets (OpenAI, Anthropic, etc.)
    - [ ] Section SDK snippets (curl + Node + Python) avec headers attribution (x-pulse-app, x-pulse-project, x-pulse-client)
    - [ ] Lien navigation admin ajouté (si pas déjà)

### F) Onboarding Integration

11. ✅ **Step AI Providers dans Wizard**
    - [ ] Wizard affiche step "AI Providers" seulement si aucune connection active
    - [ ] Step optionnel (peut être skippé)
    - [ ] Si providers existent, considère "AI Gateway configured"
    - [ ] `data-testid="onboarding-step-5"` présent

### G) Validation Manuelle

12. ✅ **Tests End-to-End**
    - [ ] Connecter provider OpenAI + test OK
    - [ ] Ajouter route model (e.g., gpt-4)
    - [ ] Appeler `/api/ai/request` avec model gpt-4 => log + costEvent créé
    - [ ] Budgets/policies appliqués correctement
    - [ ] Erreurs propres si provider manquant: "No provider connected for model X. Go to /admin/integrations/ai"
    - [ ] Test avec multiple providers (OpenAI + Anthropic)
    - [ ] Test priority routing (2 routes même model, priority différente)

### H) Contraintes Techniques

13. ✅ **Multi-tenant strict**
    - [ ] Tous les endpoints vérifient `orgId` scoping
    - [ ] Un org ne peut pas accéder aux providers d'un autre org

14. ✅ **RBAC**
    - [ ] Admin only pour clés/routes/test
    - [ ] User/finance/manager ne peuvent pas créer/modifier providers

15. ✅ **TypeScript strict**
    - [ ] Build TypeScript passe sans erreur
    - [ ] Types corrects partout

16. ✅ **Pas de breaking changes**
    - [ ] Routes existantes `/api/ai/request` fonctionnent toujours
    - [ ] Fallback à `OPENAI_API_KEY` env var si aucun provider configuré
    - [ ] Aucune route supprimée

### Notes

- Les providers supportés: OPENAI, ANTHROPIC, XAI, GOOGLE, MISTRAL
- Le router trouve automatiquement le provider selon les routes configurées
- La priority permet de choisir quel provider utiliser si plusieurs routes pour même model
- Le chiffrement utilise AES-GCM avec clé dérivée de AUTH_SECRET
- Les clés API ne sont jamais renvoyées après création (seulement last4 pour affichage)

