import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import ChatWidget from './ChatWidget.tsx';

function Layout() {
  return (
    <>
      <Header />
      <main className="container">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}

export default Layout;
