import './globals.css';

export const metadata = {
  title: 'Blue Lifeline Demo Day Console',
  description: 'End-to-end Blue Lifeline workflow demo with schools, basin map, simulation, issuance and retirement.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
