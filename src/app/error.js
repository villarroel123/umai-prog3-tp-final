'use client';
export default function Error({ reset }) { return <div className="inner-page history-empty"><h1>Algo salió mal.</h1><p>Intentá cargar la página nuevamente.</p><button className="button-primary" onClick={() => reset()}>Reintentar</button></div>; }
