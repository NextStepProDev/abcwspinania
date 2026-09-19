## Co się zmienia

<!-- Jedno-dwa zdania. Co i po co, nie jak. -->

## Jak sprawdzić

<!-- Kroki, po których widać, że działa. -->

## Lista kontrolna

- [ ] `npm run lint`, `npm run format:check`, `npx tsc --noEmit`, `npm test`, `npm run build` przechodzą
- [ ] `npm audit --omit=dev --audit-level=high` czysty (to bramka blokująca w CI)
- [ ] Zmiana modelu treści? → `npm run generate:types` **i** `npm run migrate:create`, oba pliki w commicie
- [ ] Zmiana w `Dockerfile` lub `package-lock.json`? → obraz zbudowany lokalnie pod `linux/arm64`
- [ ] Podbicie Node w `Dockerfile`? → ta sama wersja zmieniona w `ci.yml`
- [ ] Nowa decyzja projektowa lub pułapka? → dopisana do `CLAUDE.md`
