import Link from 'next/link';
import BrandLogo from '@/app/components/BrandLogo';
import styles from '@/app/about/page.module.css';

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <BrandLogo size={32} />
            <span>Draftora</span>
          </div>
          <nav className={styles.nav}>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </nav>
        </header>

        <main className={styles.main}>
          <p className={styles.eyebrow}>About Draftora</p>
          <h1>AI writing improvement built for students.</h1>
          <p>
            Draftora helps students practice writing with instant feedback, smart rewrites, and vocabulary growth tools. Our goal is
            simple: make writing progress clear, motivating, and consistent.
          </p>
          <p>
            Whether you are building confidence with short drafts or aiming for higher-level structure and clarity, Draftora turns each
            writing session into visible progress.
          </p>

          <div className={styles.actions}>
            <Link href="/signup" className={styles.primaryBtn}>
              Start Writing
            </Link>
            <Link href="/" className={styles.secondaryBtn}>
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
