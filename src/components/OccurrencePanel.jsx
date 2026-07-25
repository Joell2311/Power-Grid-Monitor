import "../styles/OccurrencePanel.css";

function OccurrencePanel() {
  return (
    <aside className="occurrence-panel">

      <div className="panel-header">
        <h2>🔴 Ocorrência Ativa</h2>
        <span className="priority high">Prioridade Alta</span>
      </div>

      <div className="occurrence-item">
        <strong>Subestação</strong>
        <span>CMG - Camaragibe</span>
      </div>

      <div className="occurrence-item">
        <strong>Alimentador</strong>
        <span>CMG-01C4</span>
      </div>

      <div className="occurrence-item">
        <strong>Equipamento</strong>
        <span>Religador R04</span>
      </div>

      <div className="occurrence-item">
        <strong>Horário</strong>
        <span>19:42:15</span>
      </div>

      <div className="status-off">
        🔴 DESLIGADO
      </div>

      <hr />

      <h3>Impacto</h3>

      <div className="occurrence-item">
        <strong>Clientes</strong>
        <span>3567</span>
      </div>

      <div className="occurrence-item">
        <strong>Hospital</strong>
        <span>01</span>
      </div>

      <div className="occurrence-item">
        <strong>Escolas</strong>
        <span>02</span>
      </div>

      <hr />

      <h3>Análise da Manobra</h3>

      <div className="occurrence-item">
        <strong>Transferência</strong>
        <span>CMG-01C3</span>
      </div>

      <div className="occurrence-item">
        <strong>Corrente Atual</strong>
        <span>180 A</span>
      </div>

      <div className="occurrence-item">
        <strong>Capacidade</strong>
        <span>350 A</span>
      </div>

      <div className="allowed">
        🟢 MANOBRA PERMITIDA
      </div>

      <div className="panel-buttons">

        <button className="btn-blue">
          Localizar
        </button>

        <button className="btn-green">
          Simular Manobra
        </button>

      </div>

    </aside>
  );
}

export default OccurrencePanel;