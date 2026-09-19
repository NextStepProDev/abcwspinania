import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wider text-rope">404</p>
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Nie ma takiej strony
      </h1>
      <p className="max-w-[60ch] text-rock-600">
        Możliwe, że adres się zmienił albo w linku jest literówka.
      </p>
      <Link
        href="/"
        className="mt-2 inline-block rounded-md bg-rock-900 px-5 py-3 font-medium text-rock-50"
      >
        Wróć na stronę główną
      </Link>
    </main>
  )
}
