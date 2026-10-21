import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Ui'
import {
  PolicyList as List,
  PolicyMail,
  PolicySection as Section,
  policyDate,
  policyLinkClass,
} from '@/components/PolicyParts'
import {
  BOOKING_RETENTION_YEARS,
  CAMP_HEALTH_RETENTION_MONTHS,
  MESSAGE_RETENTION_MONTHS,
  PENDING_NEWSLETTER_DAYS,
  UNVERIFIED_ACCOUNT_DAYS,
} from '@/lib/expiry'
import { CONTROLLER, PRIVACY_POLICY_VERSION } from '@/lib/legal'
import { pageMetadata } from '@/lib/seo'

/**
 * The privacy policy in English — a translation of `/polityka-prywatnosci`
 * (added 10.10.2026), so a foreign participant can read what happens to the
 * data they give. The Polish text is the binding one, and it says so below.
 *
 * ⚠️ Change the Polish policy — change this one in the same commit. Periods
 * come from the same constants, so those cannot drift; the wording can.
 * `lang="en"` on `<main>`: the layout's `<html>` is Polish.
 */

export function generateMetadata(): Metadata {
  const base = pageMetadata({
    title: 'Privacy policy',
    description:
      'Who processes your data at ABC Wspinania, why, for how long, and what your rights are.',
    path: '/en/privacy-policy',
  })
  return {
    ...base,
    alternates: { ...base.alternates, languages: { pl: '/polityka-prywatnosci' } },
    openGraph: { ...base.openGraph, locale: 'en_GB' },
  }
}

const mail = <PolicyMail />

export default function PrivacyPolicyEnglishPage() {
  return (
    <main lang="en">
      <Container className="pb-16 pt-10 lg:pb-24 lg:pt-14">
        <article className="mx-auto max-w-[760px]">
          <h1 className="text-balance text-[34px] leading-[1.1] lg:text-[44px]">Privacy policy</h1>
          <p className="mt-3 text-rock-600">
            Version of {policyDate(PRIVACY_POLICY_VERSION)}. A translation of the{' '}
            <Link href="/polityka-prywatnosci" hrefLang="pl" lang="pl" className={policyLinkClass}>
              Polish policy
            </Link>
            , which is the binding text.
          </p>

          <Section title="Who is responsible for your data">
            <p>
              The controller of the personal data collected through the website of the ABC Wspinania
              climbing school is <strong>{CONTROLLER.person}</strong>, trading as{' '}
              <strong>{CONTROLLER.businessName}</strong>, {CONTROLLER.street}, {CONTROLLER.postcode}{' '}
              {CONTROLLER.town}, Poland, tax ID (NIP) {CONTROLLER.nip}, REGON {CONTROLLER.regon}.
            </p>
            <p>
              For anything about your personal data, write to {mail}. We reply within one month at
              the latest.
            </p>
          </Section>

          <Section title="What we collect and why">
            <p>We collect only what a given matter needs:</p>
            <List>
              <li>
                <strong>Contact form</strong> — your name, email address, phone number (if you give
                it) and your message. To answer your question. Legal basis: your consent (Art.
                6(1)(a) GDPR) and replying to an enquiry before a possible contract (Art. 6(1)(b)
                GDPR).
              </li>
              <li>
                <strong>Course booking</strong> — first name, surname, email address, phone number
                and your notes. To run the course: confirm your place, send information about it,
                settle the payment. Legal basis: the contract for taking part in the course (Art.
                6(1)(b) GDPR) and, for settlements, tax obligations (Art. 6(1)(c) GDPR).
              </li>
              <li>
                <strong>Signing a child up for a camp</strong> — the parent&apos;s or
                guardian&apos;s details (first name, surname, email address, phone number) and the
                child&apos;s first name and surname. To reserve the place and send the next steps.
                Legal basis: the contract for the child taking part in the camp (Art. 6(1)(b) GDPR).
              </li>
              <li>
                <strong>Camp registration form</strong> — the parent&apos;s home address (for the
                contract and the invoice), the child&apos;s PESEL number and date of birth, height
                (for the T-shirts) and information about the child&apos;s health: allergies,
                medication, diet and conditions that may affect their safety. To conclude the
                contract, run the camp and keep the child safe and looked after. Legal basis: the
                contract (Art. 6(1)(b) GDPR) and, for the health information, your explicit consent
                (Art. 9(2)(a) GDPR). Only the school sees the health information; we never send it
                by email.
              </li>
              <li>
                <strong>Consent to photos of the child</strong> — optional. With it, we may publish
                photos and videos from the camp in which the child can be seen, on the website and
                our social media. Legal basis: your consent (Art. 6(1)(a) GDPR), which you can
                withdraw at any time.
              </li>
              <li>
                <strong>Participant account</strong> — first name, surname, email address, phone
                number, the language of our emails and your password (stored as a cryptographic hash
                it cannot be recovered from — nobody knows it, the school included). To keep your
                account and show your bookings. Legal basis: the contract for keeping the account
                (Art. 6(1)(b) GDPR).
              </li>
              <li>
                <strong>Newsletter</strong> — your email address and language. To send news about
                course dates, camps and new articles. Legal basis: your consent (Art. 6(1)(a) GDPR).
                Signing up has to be confirmed with a link in an email, so nobody can sign up
                someone else&apos;s address.
              </li>
              <li>
                <strong>Messages to people booked on a course or camp</strong> — if you have a
                booking (or signed a child up), we may write to you about it (a meeting time, what
                to pack, a change of plan). This is part of running it, not marketing.
              </li>
              <li>
                <strong>Server logs</strong> — on every visit the server records technical data: IP
                address, date, the address visited and the browser type. To protect the site from
                abuse and to spot failures. Legal basis: our legitimate interest (Art. 6(1)(f)
                GDPR).
              </li>
            </List>
            <p>
              Giving your data is voluntary, but without it we cannot answer your message, book you
              on a course or a child on a camp, or open an account.
            </p>
          </Section>

          <Section title="How long we keep data">
            <List>
              <li>
                <strong>Contact-form messages</strong> — {MESSAGE_RETENTION_MONTHS} months from
                sending, then deleted automatically.
              </li>
              <li>
                <strong>Course bookings</strong> — while the course is being organised, then for{' '}
                {BOOKING_RETENTION_YEARS} years from the end of the year the course took place in
                (settlements and possible claims). After that, on 1 January, the personal data is
                removed from them automatically (name, email, phone, notes) — only an anonymous
                record of the date and the number of participants stays, for statistics. Exception:
                bookings attached to your account stay while you have the account — they are your
                history under My account. Once the account is deleted, the same{' '}
                {BOOKING_RETENTION_YEARS}-year rule applies.
              </li>
              <li>
                <strong>Camp bookings</strong> — as course bookings: {BOOKING_RETENTION_YEARS} years
                from the end of the camp&apos;s year, then the parent&apos;s and the child&apos;s
                personal data is removed from them (the address and the date of birth included).
              </li>
              <li>
                <strong>The child&apos;s PESEL number and health information</strong> from the
                registration form — shorter: deleted automatically{' '}
                {CAMP_HEALTH_RETENTION_MONTHS === 1
                  ? 'one month'
                  : `${CAMP_HEALTH_RETENTION_MONTHS} months`}{' '}
                after the camp ends.
              </li>
              <li>
                <strong>Account</strong> — until you delete it. An unconfirmed account is deleted
                automatically after {UNVERIFIED_ACCOUNT_DAYS} days. When an account is deleted, its
                course bookings stay with the school (no longer linked to it) on the terms above.
              </li>
              <li>
                <strong>Newsletter</strong> — until you unsubscribe. An unconfirmed sign-up is
                deleted automatically after {PENDING_NEWSLETTER_DAYS} days. After you unsubscribe we
                keep your address, the text of the consent you gave and the dates of signing up and
                unsubscribing — to be able to show what you consented to and when you withdrew.
              </li>
              <li>
                <strong>Server logs</strong> — of limited size; the oldest entries are overwritten
                automatically.
              </li>
              <li>
                <strong>Backups</strong> — encrypted backups of the database are kept for up to 40
                days, then deleted automatically.
              </li>
            </List>
          </Section>

          <Section title="Who receives the data">
            <p>
              We do not sell data or pass it on to anyone for marketing. We use trusted service
              providers who process data only on our behalf:
            </p>
            <List>
              <li>
                <strong>Server provider</strong> (a data centre in the European Union) — the server
                the website and the database run on.
              </li>
              <li>
                <strong>Brevo</strong> (Sendinblue SAS, France, EU) — sending emails: booking
                confirmations, messages to participants and the newsletter. The emails carry no
                health information and no PESEL number. Brevo adds a mechanism counting opens and
                link clicks to emails; we use it in anonymised mode — the statistics are aggregate
                only and not attributed to any person.
              </li>
              <li>
                <strong>Cloudflare</strong> (Cloudflare, Inc., USA) — sits between visitors and the
                site and protects it from attacks; it sees, among other things, the visitor&apos;s
                IP address. Data goes to the USA under the EU Standard Contractual Clauses and the
                EU-US Data Privacy Framework.
              </li>
              <li>
                <strong>Google</strong> (Google Ireland Ltd., EU) — storing backups on Google Drive.
                Backups are encrypted before they leave our server, so Google has no access to their
                content.
              </li>
              <li>
                <strong>Technical support</strong> — the person who maintains the website and the
                server.
              </li>
            </List>
            <p>
              We may also pass data to public authorities where the law requires it (for example to
              the tax office, for settlements).
            </p>
          </Section>

          <Section title="Your rights">
            <p>You have the right to:</p>
            <List>
              <li>access your data and receive a copy of it,</li>
              <li>have incorrect data corrected,</li>
              <li>have your data erased (&ldquo;the right to be forgotten&rdquo;),</li>
              <li>restrict processing,</li>
              <li>move your data to another controller,</li>
              <li>object to processing based on our legitimate interest (such as server logs),</li>
              <li>
                withdraw your consent at any time — without affecting what we did before you
                withdrew it.
              </li>
            </List>
            <p>
              The simplest way: write to {mail}. Some things you can do yourself — delete your
              account under{' '}
              <Link href="/konto" className={policyLinkClass}>
                My account
              </Link>
              , and unsubscribe from the newsletter with the link at the bottom of every issue.
            </p>
            <p>
              If you believe we process your data unlawfully, you can complain to the Polish data
              protection authority, the President of the Personal Data Protection Office (Prezes
              Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              The site uses no advertising or analytics cookies and does not track you across sites.
              That is why there is no cookie banner.
            </p>
            <p>
              We use only the cookie needed to log in (<code>payload-token</code>) — it is set when
              you log in and keeps you logged in from page to page. Cloudflare may also set a
              technical cookie that protects the site from bots.
            </p>
          </Section>

          <Section title="Security">
            <p>
              The connection to the site is encrypted (HTTPS). Account passwords are stored as a
              cryptographic hash they cannot be recovered from. Only the school has access to the
              data in the admin panel — above all to the children&apos;s health information, kept
              apart and deleted a month after the camp. Backups are encrypted before they leave the
              server.
            </p>
          </Section>

          <Section title="Automated decisions">
            <p>
              We make no automated decisions about you and do not profile you. The only automatic
              step is the order of the waiting list: when a course or a camp turnus is full, a
              booking goes onto the list, and the school decides who gets a place from it.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we change how we process data, we will update this page and the version date at the
              top.
            </p>
          </Section>
        </article>
      </Container>
    </main>
  )
}
