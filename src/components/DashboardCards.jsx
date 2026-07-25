function DashboardCards() {
  return (
    <div className="dashboard-container">

      <h2>📊 Dashboard Operacional</h2>

      <div className="dashboard-cards">

        <div className="card">
          <span className="card-icon">📍</span>
          <h2>120</h2>
          <p>Pontos Monitorados</p>
        </div>

        <div className="card alarm-card">
          <span className="card-icon">🚨</span>
          <h2>04</h2>
          <p>Ocorrências Ativas</p>
        </div>

        <div className="card">
          <span className="card-icon">🚚</span>
          <h2>08</h2>
          <p>Equipes em Campo</p>
        </div>

        <div className="card">
          <span className="card-icon">⏱️</span>
          <h2>05 min</h2>
          <p>Tempo Médio</p>
        </div>

      </div>

    </div>
  );
}

export default DashboardCards;