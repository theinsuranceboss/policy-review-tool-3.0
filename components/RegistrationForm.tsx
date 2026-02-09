import React from 'react';

const RegistrationForm: React.FC = () => {

  // He extraído el ID de tu código para crear la URL segura para React
  const ZAPIER_FORM_URL = "https://interfaces.zapier.com/embed/page/cmkmy80ag006s10ek5p3z5au5"; 

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-700">
      
      {/* HEADER: Estilo The Boss */}
      <div className="mb-10 space-y-6">
        <h1 className="text-6xl md:text-[7rem] font-black leading-[0.8] tracking-tighter text-white uppercase">
          Verify Your <br />
          <span className="text-yellow-400">Authority</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-2xl font-bold max-w-2xl mx-auto leading-tight opacity-90">
          The Boss requires your details via the secure terminal below.
        </p>
      </div>

      {/* CONTENEDOR DEL FORMULARIO DE ZAPIER */}
      <div className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-3xl p-2 md:p-4 rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* IFRAME: Carga tu formulario específico */}
        <iframe 
          src={ZAPIER_FORM_URL}
          width="100%" 
          height="700px" /* Ajusté la altura a 700px para que quepa bien el botón */
          frameBorder="0"
          style={{ 
            background: 'transparent', 
            borderRadius: '20px'
          }}
          title="Boss Access Form"
        ></iframe>

      </div>
      
      <p className="mt-8 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          Secure Connection Established via Zapier HQ.
      </p>

    </div>
  );
};

export default RegistrationForm;