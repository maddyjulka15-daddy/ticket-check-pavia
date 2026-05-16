import Link from 'next/link';

export const metadata = { title: 'Privacy — Ticket Check Pavia' };

export default function PrivacyPage() {
  return (
    <main style={{ lineHeight: 1.6 }}>
      <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>← Home</Link>
      <h1 style={{ fontSize: 28, margin: '12px 0 16px' }}>Informativa sulla Privacy</h1>

      <p style={{ color: '#aaa', fontSize: 13 }}>Ultimo aggiornamento: 16 maggio 2026</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Chi siamo</h2>
      <p>Ticket Check Pavia è un servizio gratuito gestito da un privato cittadino. Non siamo affiliati a Trenord, Trenitalia o a qualsiasi altra società di trasporto.</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Quali dati raccogliamo</h2>
      <p>Raccogliamo il minimo indispensabile per far funzionare il servizio:</p>
      <ul>
        <li><strong>ID dispositivo anonimo:</strong> un identificatore casuale generato dal tuo browser e salvato localmente (localStorage). Serve solo a prevenire segnalazioni multiple dallo stesso dispositivo. Non è collegato a te, al tuo nome, email o numero di telefono.</li>
        <li><strong>Numero treno e orario della segnalazione:</strong> quando segnali un controllore, salviamo il numero del treno e l'ora.</li>
        <li><strong>Indirizzo IP:</strong> registrato temporaneamente dal nostro provider (Vercel) per scopi tecnici e di sicurezza. Non lo usiamo per profilarti.</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Cosa NON raccogliamo</h2>
      <ul>
        <li>Nome, email, numero di telefono</li>
        <li>Posizione GPS</li>
        <li>Dati di pagamento</li>
        <li>Cookie pubblicitari o di tracciamento</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Per quanto tempo conserviamo i dati</h2>
      <p>Le segnalazioni vengono mostrate per 60 minuti e poi non sono più visibili nell'app. Vengono conservate nel database per analisi aggregate e potrebbero essere eliminate periodicamente.</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Base giuridica (GDPR)</h2>
      <p>Trattiamo i dati sulla base del legittimo interesse (Art. 6.1.f GDPR) per fornire un servizio di pubblica utilità ai pendolari.</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>I tuoi diritti</h2>
      <p>Hai diritto a:</p>
      <ul>
        <li>Accedere ai dati che ti riguardano</li>
        <li>Chiederne la cancellazione</li>
        <li>Opporti al trattamento</li>
      </ul>
      <p>Per cancellare il tuo ID dispositivo: cancella i dati del sito dal tuo browser.</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Servizi di terze parti</h2>
      <ul>
        <li><strong>Vercel</strong> (USA) — hosting del sito</li>
        <li><strong>Supabase</strong> (UE) — database delle segnalazioni</li>
        <li><strong>ViaggiaTreno</strong> — dati pubblici degli orari treni</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Disclaimer</h2>
      <p>Le segnalazioni provengono dagli utenti e non sono verificate. Non garantiamo accuratezza. <strong>Acquista sempre un biglietto valido prima di salire sul treno.</strong> Questo servizio ha scopo informativo e di awareness civica, non incoraggia l'evasione tariffaria.</p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Contatti</h2>
      <p>Per qualsiasi domanda relativa a questa informativa, contatta: <strong>maddyjulka15@gmail.com</strong></p>
    </main>
  );
}
