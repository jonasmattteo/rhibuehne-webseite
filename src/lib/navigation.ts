export type NavItem = { label: string; href?: string; children?: { label: string; href: string }[] };

export const navigation: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Theater',
    children: [
      { label: 'Tickets / Reservation', href: '/tickets' },
      { label: 'Tribühne / Saal', href: '/tribuehne-saal' },
      { label: 'Archiv – alle Stücke', href: '/archiv' },
    ],
  },
  {
    label: 'Verein',
    children: [
      { label: 'Über uns', href: '/ueber-uns' },
      { label: 'Vorstand', href: '/vorstand' },
      { label: 'Sponsoren / Gönner', href: '/sponsoren' },
      { label: 'Vereinsanlässe', href: '/anlaesse' },
      { label: 'Mitglied werden', href: '/mitglied-werden' },
      { label: 'Mitgliederbereich', href: '/mitglieder' },
    ],
  },
  { label: 'Archiv', href: '/archiv' },
  { label: 'Links', href: '/links' },
  { label: 'Kontakt', href: '/kontakt' },
];
