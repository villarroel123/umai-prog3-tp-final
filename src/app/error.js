'use client';
export default function Error({ reset }) { return <div className="container page-space empty-state"><h1>Algo salió mal.</h1><p>Intentá cargar la página nuevamente.</p><button className="button button-dark" onClick={() => reset()}>Reintentar</button></div>; }
