"""La mention de demonstrateur, cote serveur.

La phrase est celle de `frontend/components/legal/mention.ts`, au caractere
pres. Elle est ecrite deux fois parce que Python ne peut pas importer un module
TypeScript, et nulle part ailleurs : `test_mention.py` compare les deux
fichiers et echoue si l'une des copies derive.

Ne pas reformuler sans accord ecrit du donneur d'ordre : c'est une mention de
conformite, pas une accroche.
"""

MENTION_DEMONSTRATEUR = (
    "Démonstrateur technique, ne constitue pas un service public en exploitation."
)
