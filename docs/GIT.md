# Guía de Git – Kiosko El Rápido

## Ramas
- `main`: solo versiones entregables.
- `develop`: integra el trabajo de todos.
- Una rama por tarea, creada desde `develop`, con el formato `tipo/descripcion-corta`.
  Ejemplos: `feat/cart-context`, `fix/filtro-categoria`, `docs/git-md`, `chore/gitignore`.

## Flujo de trabajo
1. `git switch develop` y `git pull`
2. `git switch -c tipo/descripcion`
3. Hacer cambios y commitear.
4. `git push -u origin tipo/descripcion`
5. Abrir un PR hacia `develop` (usar la plantilla) y pedir revisión si el cambio afecta a otra persona.
6. El PR es obligatorio. La aprobación es opcional: se pide cuando el cambio afecta a otra persona (contrato, esquemas, estructura). Si nadie contesta, el autor puede mergear y deja un comentario avisando.
7. El autor mergea con **Squash and merge**, usando como título un commit en formato Conventional Commits, y borra la rama.

## Conventional Commits
Formato: `tipo(alcance): descripción en minúsculas` (salvo nombres propios).

Tipos: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`.

Ejemplos:
- `feat(front): agregar CartContext`
- `fix(front): corregir filtro por categoría en Products`
- `feat(back): agregar endpoint POST /api/orders`
- `docs: agregar guía de Git`
- `chore: agregar .gitignore y .env.example`

## Reglas del equipo
- Configurar el mail de Git solo con `--global`, usando el mail noreply de GitHub.
- Nunca subir `.env`, llaves ni contraseñas.
- Los cambios a `main` o `develop` no se pushean directo: siempre por PR.
- Quien escribe el código no escribe sus tests: los hace otra persona.
- Cada PR enlaza su tarjeta de Trello.

