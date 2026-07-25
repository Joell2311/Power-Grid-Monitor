function Header() {
  return (
    <header className="header">

      <div className="header-left">
        <h1>⚡ COI Monitor</h1>
        <p>Centro de Operações Integradas</p>
      </div>

      <div className="header-right">

        <div className="status-online">
          <span className="status-dot"></span>
          Sistema Online
        </div>

        <div className="user-info">
          Operador COI
        </div>

      </div>

    </header>
  );
}

export default Header;