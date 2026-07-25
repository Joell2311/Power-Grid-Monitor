function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        ⚡ COI
      </div>

      <nav>

        <button className="menu-item active">
          📊 Dashboard
        </button>

        <button className="menu-item">
          🗺️ Mapa Operacional
        </button>

        <button className="menu-item">
          🚨 Ocorrências
        </button>

        <button className="menu-item">
          ⚡ Alimentadores
        </button>

        <button className="menu-item">
          🔌 Equipamentos
        </button>

        <button className="menu-item">
          👷 Equipes
        </button>

        <button className="menu-item">
          📈 Indicadores
        </button>

        <button className="menu-item">
          📄 Relatórios
        </button>

        <button className="menu-item">
          ⚙️ Configurações
        </button>

      </nav>

      <div className="sidebar-footer">
        COI Monitor v1.0
      </div>

    </aside>
  );
}

export default Sidebar;