export default function Footer() {
    const links = [
        { label: 'Email', href: 'mailto:contact@resume-builder.com' },
        { label: 'GitHub', href: 'https://github.com' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com' },
    ]

    return (
        <footer className="site-footer">
            <span>Автоматизоване Резюме</span>
            <nav aria-label="Контакти">
                {links.map((link) => (
                    <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                    </a>
                ))}
            </nav>
        </footer>
    )
}