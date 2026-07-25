function AlarmBar() {
  return (
    <div className="alarm-bar">

      <div className="alarm critical">

        <div className="alarm-left">
          <span className="alarm-icon">🔴</span>

          <div className="alarm-info">
            <strong>CMG-01C4 DESLIGADO</strong>

            <p>
              3.567 clientes interrompidos • Prioridade Alta
            </p>
          </div>
        </div>

        <div className="alarm-right">

          <span className="alarm-time">
            19:42
          </span>

          <button className="alarm-button">
            Detalhes
          </button>

        </div>

      </div>

    </div>
  );
}

export default AlarmBar;