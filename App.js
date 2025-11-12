import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

const colorGrupos = ["#f9e0f7", "#f7d6e0", "#f0e5f9", "#fde4e4", "#f7f0e0"];

function App() {
  const [women, setWomen] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [mujeresEstadoGrupo, setMujeresEstadoGrupo] = useState({});
  const [asistencia, setAsistencia] = useState({});
  const [fechasAsistencia, setFechasAsistencia] = useState([
    "6/5", "13/5", "20/5", "27/5", "3/6", "10/6", "17/6", "24/6"
  ]);
  const [buscarTexto, setBuscarTexto] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const fileInputRef = useRef();
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayName, setBirthdayName] = useState("");
  const [duplicados, setDuplicados] = useState([]);
  const [showDuplicatesSection, setShowDuplicatesSection] = useState(false);
  const [messageModal, setMessageModal] = useState({ show: false, message: "" });
  const [procesosGuardados, setProcesosGuardados] = useState(() => {
    const saved = localStorage.getItem('procesosGuardados');
    return saved ? JSON.parse(saved) : [];
  });

  const showMessage = (message) => setMessageModal({ show: true, message });

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    let nuevoEstado = {};
    groups.forEach(g => {
      nuevoEstado[g.id] = { normal: new Set(), difusion: new Set() };
    });
    women.forEach(w => {
      if (w.grupo && groups.find(g => g.id === w.grupo)) {
        nuevoEstado[w.grupo].normal.add(w.id);
      }
    });
    setMujeresEstadoGrupo(nuevoEstado);
  }, [women, groups]);

  useEffect(() => {
    const checkBirthdays = () => {
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      const mesHoy = hoy.getMonth() + 1;
      women.forEach(w => {
        if (w.cumpleaños) {
          const partes = w.cumpleaños.split('/');
          if (partes.length >= 2) {
            const diaCumple = parseInt(partes[0]);
            const mesCumple = parseInt(partes[1]);
            if (diaCumple === diaHoy && mesCumple === mesHoy) {
              setBirthdayName(`${w.nombre} ${w.apellido}`);
              setShowBirthdayModal(true);
            }
          }
        }
      });
    };
    checkBirthdays();
    const interval = setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [women]);

  function mujerDuplicada(nombre, apellido) {
    return women.some(w => w.nombre.toLowerCase() === nombre.toLowerCase() && w.apellido.toLowerCase() === apellido.toLowerCase());
  }

  function addWoman(newWoman) {
    if (mujerDuplicada(newWoman.nombre, newWoman.apellido)) {
      showMessage(`La mujer ${newWoman.nombre} ${newWoman.apellido} ya está registrada.`);
      return;
    }
    newWoman.id = women.length + 1;
    if (!newWoman.grupo) newWoman.grupo = null;
    setWomen(old => [...old, newWoman]);
  }

  function addGroup(name) {
    if (!name.trim()) {
      showMessage("Ingrese nombre válido para el grupo");
      return;
    }
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      showMessage("Ya existe un grupo con ese nombre");
      return;
    }
    const newGroup = {
      id: groups.length + 1,
      name,
      discipuladora: "",
      secretaria: "",
      dia: "",
      horario: "",
      periodoMesInicio: "",
      periodoMesFin: "",
      periodoAnio: ""
    };
    setGroups(old => [...old, newGroup]);
  }

  function updateGroupField(id, campo, valor) {
    setGroups(old => old.map(g => g.id === id ? { ...g, [campo]: valor } : g));
  }

  function assignWomanToGroup(womanId, newGroupId) {
    setConfirmAction({
      message: "¿Asignar esta mujer al grupo seleccionado?",
      onConfirm: () => {
        setWomen(old => old.map(w => {
          if (w.id === womanId) {
            return { ...w, grupo: newGroupId };
          }
          return w;
        }));
        setConfirmAction(null);
      },
      onCancel: () => setConfirmAction(null)
    });
  }

  function removeWomanFromGroup(womanId) {
    setConfirmAction({
      message: "¿Quitar esta mujer de su grupo?",
      onConfirm: () => {
        setWomen(old => old.map(w => {
          if (w.id === womanId) {
            return { ...w, grupo: null };
          }
          return w;
        }));
        setConfirmAction(null);
      },
      onCancel: () => setConfirmAction(null)
    });
  }

  function moverEstadoMujer(groupId, womanId, desde, hacia) {
    setConfirmAction({
      message: `¿Mover a ${hacia}?`,
      onConfirm: () => {
        setMujeresEstadoGrupo(old => {
          const copia = { ...old };
          if (!copia[groupId]) return old;
          copia[groupId] = {
            normal: new Set(copia[groupId].normal),
            difusion: new Set(copia[groupId].difusion),
          };
          copia[groupId][desde].delete(womanId);
          copia[groupId][hacia].add(womanId);
          return copia;
        });
        setConfirmAction(null);
      },
      onCancel: () => setConfirmAction(null)
    });
  }

  const cambiaAsistencia = (womanId, fecha, valor) => {
    setAsistencia(old => {
      const copia = { ...old };
      if (!copia[womanId]) copia[womanId] = {};
      copia[womanId][fecha] = valor;
      return copia;
    });
  };

  function interpretarCumpleanno(texto) {
    if (!texto) return "";
    try {
      let fecha = new Date(texto);
      if (!isNaN(fecha.getTime())) {
        return `${fecha.getDate().toString().padStart(2,"0")}/${(fecha.getMonth()+1).toString().padStart(2,"0")}/${fecha.getFullYear()}`;
      }
      const meses = {
        ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
        jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12
      };
      const t = texto.toLowerCase().replace(/[.,]/g, '').trim();
      const partes = t.split(" ");
      if (partes.length===2) {
        const dia = parseInt(partes[0],10);
        let mes = meses[partes[1].slice(0,3)];
        if (!mes) mes = parseInt(partes[1],10);
        if(dia>0 && dia<=31 && mes>0 && mes<=12) {
          const hoy = new Date();
          let anio = hoy.getFullYear();
          const fechaTentativa = new Date(anio, mes - 1, dia);
          if (fechaTentativa < hoy) anio++;
          return `${dia.toString().padStart(2,"0")}/${mes.toString().padStart(2,"0")}/${anio}`;
        }
      }
      const partesGuion = t.split("-");
      if (partesGuion.length===2) {
        const dia = parseInt(partesGuion[0],10);
        let mes = meses[partesGuion[1].slice(0,3)];
        if(dia>0 && dia<=31 && mes>0 && mes<=12) {
          const hoy = new Date();
          let anio = hoy.getFullYear();
          const fechaTentativa = new Date(anio, mes - 1, dia);
          if (fechaTentativa < hoy) anio++;
          return `${dia.toString().padStart(2,"0")}/${mes.toString().padStart(2,"0")}/${anio}`;
        }
      }
      return texto;
    } catch {
      return texto;
    }
  }

  function importarArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => procesarDatos(results.data),
      });
    } else if (extension === "xls" || extension === "xlsx") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        procesarDatos(jsonData);
      };
      reader.readAsBinaryString(file);
    } else {
      showMessage("Archivo no soportado. Usa CSV o Excel (.xls/.xlsx)");
    }
    e.target.value = null;
  }

  function procesarDatos(dataArray) {
    const nuevos = dataArray.filter(item => {
      let apellido = "";
      let nombre = "";
      if (item["Apellido y Nombre"]) {
        const partes = item["Apellido y Nombre"].trim().split(" ");
        apellido = partes[0];
        nombre = partes.slice(1).join(" ") || "";
      } else {
        apellido = item.Apellido || item.apellido || "";
        nombre = item.Nombre || item.nombre || "";
      }
      if (!apellido || !nombre) return false;
      return !mujerDuplicada(nombre.trim(), apellido.trim());
    }).map((item, i) => {
      let apellido = "";
      let nombre = "";
      if (item["Apellido y Nombre"]) {
        const partes = item["Apellido y Nombre"].trim().split(" ");
        apellido = partes[0];
        nombre = partes.slice(1).join(" ") || "";
      } else {
        apellido = item.Apellido || item.apellido || "";
        nombre = item.Nombre || item.nombre || "";
      }
      const grupoNombre = item.Grupo || item.grupo || "";
      const grupoId = groups.find(g => g.name.toLowerCase() === grupoNombre.toLowerCase())?.id || null;
      return {
        id: women.length + 1 + i,
        apellido: apellido.trim(),
        nombre: nombre.trim(),
        cumpleaños: interpretarCumpleanno(item.Cumpleaños || item.cump || item.cumpleaños || ""),
        contacto: item.Contacto || item.contacto || "",
        direccion: item.Dirección || item.direccion || "",
        estadoCivil: item["Est. civil"] || item["Est civil"] || item.estadoCivil || item["Estado Civil"] || "",
        hijos: item.Hijos || item.hijos || "",
        observaciones: item.Observaciones || item.observaciones || "",
        grupo: grupoId
      };
    });
    if(nuevos.length === 0) {
      showMessage("No se encontraron nuevos registros para importar (sin duplicados o datos inválidos).");
      return;
    }
    setWomen(old => [...old, ...nuevos]);
    showMessage(`Se importaron ${nuevos.length} mujeres`);
  }

  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [orden, setOrden] = useState("az");
  const [paginaActual, setPaginaActual] = useState(1);
  const mujeresPorPagina = 10;

  const womenFiltradas = useMemo(() => {
    return women.filter(w => {
      if (filtroGrupo === "sinGrupo") return !w.grupo;
      if (filtroGrupo === "conGrupo") return w.grupo;
      return true;
    }).sort((a,b) => {
      if(orden==="az") return a.apellido.localeCompare(b.apellido);
      if(orden==="ultima") return b.id - a.id;
      if(orden==="primera") return a.id - b.id;
      return 0;
    });
  }, [women, filtroGrupo, orden]);

  const mujeresFiltradasBuscadas = useMemo(() => {
    return womenFiltradas.filter(w => {
      const na = (w.nombre + " " + w.apellido).toLowerCase();
      return na.includes(buscarTexto.trim().toLowerCase());
    });
  }, [womenFiltradas, buscarTexto]);

  const totalPaginas = Math.ceil(mujeresFiltradasBuscadas.length / mujeresPorPagina);
  const mujeresPaginadas = mujeresFiltradasBuscadas.slice(
    (paginaActual - 1) * mujeresPorPagina,
    paginaActual * mujeresPorPagina
  );

  function calcularEdad(fechaCumpleanos) {
    if(!fechaCumpleanos || !fechaCumpleanos.includes('/')) return "Fecha inválida";
    const partes = fechaCumpleanos.split('/');
    if (partes.length !== 3) return "Fecha inválida";
    const fechaCompleta = new Date(partes[2], partes[1] - 1, partes[0]);
    if (isNaN(fechaCompleta)) return "Fecha inválida";
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaCompleta.getFullYear();
    const m = hoy.getMonth() - fechaCompleta.getMonth();
    if (m<0 || (m===0 && hoy.getDate()<fechaCompleta.getDate())) edad--;
    return edad < 0 ? "Fecha futura" : edad;
  }

  const ConfirmModal = () => {
    if (!confirmAction) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p>{confirmAction.message}</p>
          <div className="modal-buttons">
            <button className="btn btn-danger" onClick={confirmAction.onCancel}>No</button>
            <button className="btn btn-success" onClick={confirmAction.onConfirm}>Sí</button>
          </div>
        </div>
      </div>
    );
  };

  const MessageModal = () => {
    if (!messageModal.show) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content message-modal">
          <p>{messageModal.message}</p>
          <button className="btn btn-primary" onClick={() => setMessageModal({ show: false, message: "" })}>
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  const BirthdayModal = () => {
    if (!showBirthdayModal) return null;
    return (
      <div className="modal-overlay birthday-modal">
        <div className="modal-content birthday-content">
          <div className="confetti">🎉🎂🎈</div>
          <h2>¡Feliz Cumpleaños, {birthdayName}!</h2>
          <p>Que tengas un día lleno de alegría y bendiciones.</p>
          <button className="btn btn-success" onClick={() => setShowBirthdayModal(false)}>Cerrar</button>
        </div>
      </div>
    );
  };

  const RegistroForm = () => {
    const [form, setForm] = useState({
      nombre:"", apellido:"", cumpleaños:"", contacto:"", direccion:"", estadoCivil:"", hijos:"", observaciones:"", grupo: null
    });

    const handleChange = e =>{
      const {name, value} = e.target;
      setForm(f =>({...f, [name]: value}));
    };

    const handleSubmit = e =>{
      e.preventDefault();
      if(!form.nombre.trim() || !form.apellido.trim()){
        showMessage("Nombre y apellido obligatorios");
        return;
      }
      addWoman(form);
      setForm({nombre:"", apellido:"", cumpleaños:"", contacto:"", direccion:"", estadoCivil:"", hijos:"", observaciones:"", grupo: null});
    };

    return (
      <>
        <h2 className="formulario-titulo">Registrar nueva mujer</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div><label>Nombre *</label><input type="text" name="nombre" className="form-control" value={form.nombre} onChange={handleChange} required/></div>
          <div><label>Apellido *</label><input type="text" name="apellido" className="form-control" value={form.apellido} onChange={handleChange} required/></div>
          <div><label>Cumpleaños</label><input type="text" name="cumpleaños" placeholder="ej: 15/08 o 15 ago" className="form-control" value={form.cumpleaños} onChange={handleChange}/></div>
          <div><label>Edad</label><input type="number" name="edad" className="form-control" value={calcularEdad(form.cumpleaños)} readOnly placeholder="Edad calculada"/></div>
          <div><label>Contacto</label><input type="text" name="contacto" className="form-control" value={form.contacto} onChange={handleChange}/></div>
          <div><label>Dirección</label><input type="text" name="direccion" className="form-control" value={form.direccion} onChange={handleChange}/></div>
                    <div><label>Estado Civil</label><select name="estadoCivil" className="form-control" value={form.estadoCivil} onChange={handleChange}><option value="">-- Seleccione --</option><option value="Soltera">Soltera</option><option value="Viuda">Viuda</option><option value="Casada">Casada</option></select></div>
          <div><label>Hijos</label><input type="text" name="hijos" className="form-control" value={form.hijos} onChange={handleChange}/></div>
          <div style={{gridColumn:"1 / -1"}}><label>Observaciones</label><textarea name="observaciones" className="form-control" rows={3} value={form.observaciones} onChange={handleChange}/></div>
          <div style={{gridColumn:"1 / -1"}}><label>Asignar a grupo (opcional)</label>
            <select name="grupo" className="form-control" value={form.grupo || ""} onChange={handleChange}>
              <option value="">Sin grupo</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1 / -1", textAlign:"right"}}><button type="submit" className="btn btn-primary">Registrar Mujer</button></div>
        </form>
      </>
    );
  };

  const ListadoGeneral = () => {
    return (
      <>
        <div className="controls">
                    <div><label>Filtrar por grupo:</label><select className="form-select" value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}><option value="todos">Todos</option><option value="conGrupo">Con grupo</option><option value="sinGrupo">Sin grupo</option></select></div>
          <div><label>Ordenar:</label><select className="form-select" value={orden} onChange={e => setOrden(e.target.value)}><option value="az">Alfabético A-Z</option><option value="ultima">Últimos registrados</option><option value="primera">Primeros registrados</option></select></div>
          <div><label>Buscar:</label><input type="text" className="form-control" placeholder="Buscar por nombre o apellido" value={buscarTexto} onChange={e => setBuscarTexto(e.target.value)}/></div>
          <div><label>Importar Mujeres (CSV o Excel):</label><input type="file" accept=".csv,.xls,.xlsx" className="form-control" onChange={importarArchivo} ref={fileInputRef}/></div>
        </div>
        <div className="table-responsive" style={{maxHeight:"280px"}}>
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Cumpleaños</th><th>Contacto</th><th>Dirección</th><th>Estado Civil</th><th>Hijos</th><th>Observaciones</th><th>Grupo</th><th>Asignar Grupo</th></tr>
            </thead>
            <tbody>
              {mujeresPaginadas.map(w => {
                let grupoTexto = "Sin grupo";
                if (w.grupo) {
                  const grupo = groups.find(g => g.id === w.grupo);
                  if (grupo) {
                    const estado = mujeresEstadoGrupo[w.grupo];
                    if (estado && estado.difusion.has(w.id)) {
                      grupoTexto = `Difusión de ${grupo.name}`;
                    } else {
                      grupoTexto = grupo.name;
                    }
                  }
                }
                const color = w.grupo ? colorGrupos[(w.grupo-1)%colorGrupos.length] : "";
                return (<tr key={w.id} style={{backgroundColor:color}}>
                  <td>{w.nombre}</td>
                  <td>{w.apellido}</td>
                  <td>{calcularEdad(w.cumpleaños)}</td>
                  <td>{w.cumpleaños}</td>
                  <td>{w.contacto}</td>
                  <td>{w.direccion}</td>
                  <td>{w.estadoCivil}</td>
                  <td>{w.hijos}</td>
                  <td>{w.observaciones}</td>
                  <td>{grupoTexto}</td>
                  <td>
                    <select className="form-select form-select-sm" value={w.grupo || ""} onChange={e => assignWomanToGroup(w.id, parseInt(e.target.value) || null)}>
                      <option value="">Sin grupo</option>
                      {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                    </select>
                  </td>
                </tr>);
              })}
              {mujeresPaginadas.length === 0 && <tr><td colSpan="11">No hay mujeres para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="btn btn-outline-primary" onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1}>Anterior</button>
          <span>Página {paginaActual} de {totalPaginas}</span>
          <button className="btn btn-outline-primary" onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas}>Siguiente</button>
        </div>
      </>
    );
  };

  const NuevoGrupoForm = () => {
    const [name, setName] = useState("");
    const onSubmit = e => {
      e.preventDefault();
      if(!name.trim()) {showMessage("Ingrese nombre para el grupo"); return;}
      addGroup(name.trim());
      setName("");
    };
    return (
      <form onSubmit={onSubmit} className="mb-3 d-flex gap-3">
        <input type="text" className="form-control" placeholder="Nuevo nombre de grupo" value={name} onChange={e=>setName(e.target.value)}/>
        <button type="submit" className="btn btn-primary">Agregar Grupo</button>
      </form>
    );
  };

  const ListaGrupos = () => {
    if(groups.length===0) return <p>No hay grupos creados</p>;
    return (
      <div className="mb-4 button-group">
        {groups.map(g => (
          <div key={g.id} className="d-inline-block me-2 mb-2">
            <button
              className={`btn ${selectedGroupId===g.id? "btn-primary" : "btn-outline-primary"}`}
              onClick={()=>setSelectedGroupId(g.id)}
            >
              {g.name}
            </button>
            <button
              className="btn btn-danger btn-sm ms-1"
              onClick={() => deleteGroup(g.id)}
            >
              Eliminar
            </button>
          </div>
        ))}
        <button className="btn btn-info ms-3" onClick={saveProcess}>Guardar Proceso Actual</button>
      </div>
    );
  };

  const EditarGrupo = () => {
    const grupo = groups.find(g => g.id === selectedGroupId);
    const [editingGroup, setEditingGroup] = useState(grupo || {});

    useEffect(() => {
      if (grupo) {
        setEditingGroup({ ...grupo });
      }
    }, [selectedGroupId, grupo]);

    if (!grupo) return <p>Seleccione un grupo para editar</p>;

    const handleChange = (campo, valor) => {
      setEditingGroup(prev => ({ ...prev, [campo]: valor }));
    };

    const handleSave = () => {
      Object.keys(editingGroup).forEach(campo => {
        if (editingGroup[campo] !== grupo[campo]) {
          updateGroupField(grupo.id, campo, editingGroup[campo]);
        }
      });
      showMessage("Cambios guardados");
    };

    return (
      <div>
        <form className="form-grid border rounded p-4 mb-4 bg-light" style={{ background: "#f9e6f2" }}>
          <div>
            <label>Nombre del grupo</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div>
            <label>Mes inicio</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.periodoMesInicio || ""}
              onChange={(e) => handleChange("periodoMesInicio", e.target.value)}
              placeholder="Ej: Mayo"
            />
          </div>
          <div>
            <label>Mes fin</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.periodoMesFin || ""}
              onChange={(e) => handleChange("periodoMesFin", e.target.value)}
              placeholder="Ej: Junio"
            />
          </div>
          <div>
            <label>Año</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.periodoAnio || ""}
              onChange={(e) => handleChange("periodoAnio", e.target.value)}
              placeholder="Ej: 2025"
            />
          </div>
          <div>
            <label>Discipuladora</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.discipuladora || ""}
              onChange={(e) => handleChange("discipuladora", e.target.value)}
            />
          </div>
          <div>
            <label>Secretaria</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.secretaria || ""}
              onChange={(e) => handleChange("secretaria", e.target.value)}
            />
          </div>
          <div>
            <label>Día</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.dia || ""}
              onChange={(e) => handleChange("dia", e.target.value)}
            />
          </div>
          <div>
            <label>Horario</label>
            <input
              type="text"
              className="form-control"
              value={editingGroup.horario || ""}
              onChange={(e) => handleChange("horario", e.target.value)}
            />
          </div>
        </form>
        <button className="btn btn-primary" onClick={handleSave}>
          Guardar Cambios
        </button>
      </div>
    );
  };

 const TablaGrupo = ({ grupoId, tipo }) => {
  const [editingObservaciones, setEditingObservaciones] = useState({});  // Estado local para ediciones temporales

  if (!mujeresEstadoGrupo[grupoId]) return null;
  const mujeresIds = Array.from(mujeresEstadoGrupo[grupoId][tipo]);
  const lista = women.filter(w => mujeresIds.includes(w.id));
  const grupo = groups.find(g => g.id === grupoId);

  function mover(id) { moverEstadoMujer(grupoId, id, tipo, tipo === "normal" ? "difusion" : "normal"); }

  const handleObservacionesChange = (womanId, value) => {
    setEditingObservaciones(prev => ({ ...prev, [womanId]: value }));
  };

  const saveObservaciones = (womanId) => {
    const nuevasObservaciones = editingObservaciones[womanId] || "";
    setWomen(prev => prev.map(w => w.id === womanId ? { ...w, observaciones: nuevasObservaciones } : w));
    setEditingObservaciones(prev => ({ ...prev, [womanId]: undefined }));  // Limpiar edición temporal
  };

  return (
    <div className="mb-4 card-section">
      <h3>{tipo === "normal" ? `Grupo: ${grupo?.name || ""}` : `Difusión Grupo: ${grupo?.name || ""}`}</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Observaciones</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={4}>No hay mujeres</td></tr>}
          {lista.map(w => (
            <tr key={w.id}>
              <td>{w.nombre}</td>
              <td>{w.apellido}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={editingObservaciones[w.id] !== undefined ? editingObservaciones[w.id] : w.observaciones || ""}
                    onChange={(e) => handleObservacionesChange(w.id, e.target.value)}
                    placeholder="Editar observaciones"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => saveObservaciones(w.id)}
                    style={{ height: 'fit-content' }}
                  >
                    Guardar
                  </button>
                </div>
              </td>
              <td>
                <button className="btn btn-outline-primary btn-sm" onClick={() => mover(w.id)}>
                  {tipo === "normal" ? "Mandar a Difusión" : "Volver a Grupo"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

  const AsistenciaTabla = ({ grupoId }) => {
    const tableRef = useRef(null);

    if (!mujeresEstadoGrupo[grupoId]) return null;
    const idsNormales = Array.from(mujeresEstadoGrupo[grupoId].normal);
    const idsDifusion = Array.from(mujeresEstadoGrupo[grupoId].difusion);
    const listaTotal = women.filter(w => idsNormales.concat(idsDifusion).includes(w.id));

    const conteos = fechasAsistencia.map(fecha => {
      let p = 0, a = 0;
      listaTotal.forEach(w => {
        const es = asistencia[w.id]?.[fecha];
        if (es === "P") p++;
        else if (es === "A") a++;
      });
      return { p, a };
    });

    return (
      <div className="card-section">
        <h3 className="asistencia-header">Asistencia del Grupo</h3>
        <div className="mb-3">
          <label>Editar Fechas de Asistencia (separadas por coma, ej: 6/5,13/5):</label>
          <input
            type="text"
            className="form-control"
            value={fechasAsistencia.join(',')}
            onChange={e => setFechasAsistencia(e.target.value.split(',').map(f => f.trim()))}
          />
        </div>
        <div className="table-responsive" ref={tableRef} style={{ maxHeight: "300px" }}>
          <table className="table text-center">
            <thead>
              <tr>
                <th>Nombre Completo</th>
                {fechasAsistencia.map(f => <th key={f}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {listaTotal.map(w => (
                <tr key={w.id}>
                  <td>{w.nombre} {w.apellido}</td>
                  {fechasAsistencia.map(f => {
                    const estado = asistencia[w.id]?.[f] || "";
                    return (
                      <td key={f}>
                        <select
                          className="form-select form-select-sm"
                          value={estado}
                          onChange={(e) => {
                            e.preventDefault();
                            const scrollY = window.scrollY;
                            cambiaAsistencia(w.id, f, e.target.value);
                            setTimeout(() => window.scrollTo(0, scrollY), 10);
                          }}
                          aria-label="Seleccionar asistencia"
                        >
                          <option value="">-</option>
                          <option value="P">P</option>
                          <option value="A">A</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Totales</th>
                {conteos.map((c, i) => (
                  <th key={i}>
                    <span className="text-success d-block">P: {c.p}</span>
                    <span className="text-danger d-block">A: {c.a}</span>
                  </th>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const generarPDFBlob = (grupoId) => {
    const grupo = groups.find(g => g.id === grupoId);
    if (!grupo) return null;
    const doc = new jsPDF('l', 'pt', 'a4');
    const margin = 30;
    let y = margin;

    doc.setFillColor(255, 182, 193);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');
    doc.setFillColor(255, 105, 180);
    doc.rect(200, 20, 200, 40, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(`${grupo.periodoMesInicio} - ${grupo.periodoMesFin} ${grupo.periodoAnio}`, 300, y + 10, { align: 'center' });
    y += 25;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(grupo.name, 300, y, { align: 'center' });
    y += 25;
    doc.setFontSize(12);
    doc.setTextColor(138, 43, 226);
    doc.text(`Discipuladora: ${grupo.discipuladora}`, margin, y);
    doc.setTextColor(255, 69, 0);
    doc.text(`Secretaria: ${grupo.secretaria}`, 370, y);
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.text(`Día: ${grupo.dia}`, margin, y);
    doc.text(`Horario: ${grupo.horario}`, 370, y);
    y += 20;

    const presentesAu = (lista) => {
      return fechasAsistencia.map(fecha => {
        let p = 0, a = 0;
        lista.forEach(w => {
          const est = asistencia[w.id]?.[fecha];
          if (est === "P") p++;
          else if (est === "A") a++;
        });
        return { p, a };
      });
    };

    const generarFilas = (lista) =>
      lista.map(w => [
        `${w.apellido} ${w.nombre}`,
        w.observaciones || "",
        ...fechasAsistencia.map(f => asistencia[w.id]?.[f] || "")
      ]);

    const mujeresNormales = mujeresEstadoGrupo[grupoId]
      ? Array.from(mujeresEstadoGrupo[grupoId].normal).map(id => women.find(w => w.id === id)).filter(Boolean)
      : [];
    const mujeresDif = mujeresEstadoGrupo[grupoId]
      ? Array.from(mujeresEstadoGrupo[grupoId].difusion).map(id => women.find(w => w.id === id)).filter(Boolean)
      :[];
          const head = [
      ["Apellido y Nombre", "Observaciones", { content: "Asistencias", colSpan: fechasAsistencia.length }],
      ["", "", ...fechasAsistencia]
    ];

    let rowsNormales = generarFilas(mujeresNormales);
    let conteoNormales = presentesAu(mujeresNormales);

    autoTable(doc, {
      head: head,
      body: rowsNormales,
      foot: [
        [
          { content: "Totales", colSpan: 2 },
          ...conteoNormales.map(c => ({ content: `P: ${c.p}\nA: ${c.a}`, styles: { halign: 'center' } }))
        ]
      ],
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [255, 105, 180], textColor: [255, 255, 255] },
      didParseCell: function (data) {
        if (data.section === "body" && fechasAsistencia.includes(head[1][data.column.index])) {
          let t = data.cell.text[0];
          if (t === "P") data.cell.styles.textColor = [0, 128, 0];
          else if (t === "A") data.cell.styles.textColor = [220, 0, 0];
        }
      }
    });

    y = doc.lastAutoTable.finalY + 40;

    doc.setDrawColor(255, 105, 180);
    doc.setLineWidth(2);
    doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(138, 43, 226);
    doc.text("Difusión Grupo", margin, y);
    y += 15;

    let rowsDifusion = generarFilas(mujeresDif);
    let conteoDif = presentesAu(mujeresDif);

    autoTable(doc, {
      head: head,
      body: rowsDifusion,
      foot: [
        [
          { content: "Totales", colSpan: 2 },
          ...conteoDif.map(c => ({ content: `P: ${c.p}\nA: ${c.a}`, styles: { halign: 'center' } }))
        ]
      ],
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [200, 177, 213], textColor: [255, 255, 255] },
      didParseCell: function (data) {
        if (data.section === "body" && fechasAsistencia.includes(head[1][data.column.index])) {
          let t = data.cell.text[0];
          if (t === "P") data.cell.styles.textColor = [0, 128, 0];
          else if (t === "A") data.cell.styles.textColor = [220, 0, 0];
        }
      }
    });

    return doc.output('blob');
  };
const exportarPDF = (grupoId) => {
  const grupo = groups.find(g => g.id === grupoId);
  if (!grupo) {
    showMessage("Selecciona un grupo para exportar PDF");
    return;
  }

  const doc = new jsPDF("l", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  let y = margin;

  // --- Fusndo general blanco ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // --- Header lila pastel ---
  const headerHeight = 110;
  doc.setFillColor(230, 225, 235); // lila pastel claro
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Título principal centrado y grande (MesInicio-MesFin Año)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(102, 51, 102);
  doc.text(`${grupo.periodoMesInicio}-${grupo.periodoMesFin} ${grupo.periodoAnio}`, pageWidth / 2, 40, { align: "center" });

  // Nombre grupo centrado y más pequeño
  doc.setFontSize(18);
  doc.setTextColor(130, 60, 130);
  doc.setFont("helvetica", "normal");
  doc.text(grupo.name, pageWidth / 2, 70, { align: "center" });

  // Información en la izquierda en dos filas
  const infoBoxX = margin;
  const infoBoxWidth = pageWidth * 0.62 - margin * 2;
  const infoStartY = 85;
  const col1X = infoBoxX;
  const col2X = infoBoxX + infoBoxWidth / 2;
  doc.setFontSize(12);
  doc.setTextColor(90, 50, 90);
  doc.text(`Discipuladora: ${grupo.discipuladora || "---"}`, col1X, infoStartY);
  doc.text(`Secretaria: ${grupo.secretaria || "---"}`, col2X, infoStartY);
  doc.text(`Día: ${grupo.dia || "---"}`, col1X, infoStartY + 18);
  doc.text(`Horario: ${grupo.horario || "---"}`, col2X, infoStartY + 18);

  // --- Caja Asistencias a la derecha con ancho igual al que ocupa las fechas ---
  const fechasXStart = infoBoxX + infoBoxWidth + margin;
  const fechasXEnd = pageWidth - margin - 120;
  const asistenciasBoxWidth = fechasXEnd - fechasXStart;
  const asistenciasBoxY = infoStartY - 5;
  const asistenciasBoxHeight = 35;

  doc.setFillColor(245, 220, 220); // rosa pastel
  doc.rect(fechasXStart, asistenciasBoxY, asistenciasBoxWidth, asistenciasBoxHeight, "F");

  doc.setFontSize(14);
  doc.setTextColor(102, 51, 51); // marrón suave
  doc.text("Asistencias", fechasXStart + asistenciasBoxWidth / 2, asistenciasBoxY + 20, {
    align: "center",
  });

  y = headerHeight + 20;

  // ==== FUNCIONES AUXILIARES DE CALCULO DE ASISTENCIA ====
  const presentesAu = (lista) => {
    return fechasAsistencia.map((fecha) => {
      let p = 0,
        a = 0;
      lista.forEach((w) => {
        const est = asistencia[w.id]?.[fecha];
        if (est === "P") p++;
        else if (est === "A") a++;
      });
      return { p, a };
    });
  };

  const generarFilas = (lista) =>
    lista.map((w) => [
      w.nombre,
      w.apellido,
      w.observaciones || "",
      ...fechasAsistencia.map((f) => asistencia[w.id]?.[f] || ""),
    ]);

  const mujeresNormales = mujeresEstadoGrupo[grupoId]
    ? Array.from(mujeresEstadoGrupo[grupoId].normal)
        .map((id) => women.find((w) => w.id === id))
        .filter(Boolean)
    : [];
  const mujeresDif = mujeresEstadoGrupo[grupoId]
    ? Array.from(mujeresEstadoGrupo[grupoId].difusion)
        .map((id) => women.find((w) => w.id === id))
        .filter(Boolean)
    : [];

  // Columnas para la tabla, igual para ambas tablas
  const columnas = [
    "Nombre",
    "Apellido",
    "Observaciones",
    ...fechasAsistencia,
  ];

  const head = [columnas];

  // Estilos comunes para las tablas
  const tableStyles = {
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: {
      fillColor: [230, 210, 230], // rosa pastel
      textColor: 50,
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [245, 240, 245],
      textColor: 80,
      fontStyle: "bold",
      halign: "center",
    },
    margin: { left: margin, right: margin },
  };

  // Tabla grupo normal con totales completos
  const rowsNormales = generarFilas(mujeresNormales);
  const conteoNormales = presentesAu(mujeresNormales);

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head,
    body: rowsNormales,
    foot: [
      [
        { content: "Total de mujeres:", colSpan: 3, halign: "left" },
        { content: mujeresNormales.length.toString(), halign: "center" },
        ...Array(fechasAsistencia.length - 1).fill({ content: "" }),
      ],
      [
        { content: "Total de Presentes:", colSpan: 3, halign: "left" },
        ...conteoNormales.map((c) => ({ content: c.p.toString(), halign: "center" })),
      ],
      [
        { content: "Total de Ausentes:", colSpan: 3, halign: "left" },
        ...conteoNormales.map((c) => ({ content: c.a.toString(), halign: "center" })),
      ],
    ],
    didParseCell: (data) => {
      if (
        data.section === "body" &&
        fechasAsistencia.includes(columnas[data.column.index])
      ) {
        const val = data.cell.text[0];
        if (val === "P") {
          data.cell.text = ["P"];
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.halign = "center";
        } else if (val === "A") {
          data.cell.text = ["A"];
          data.cell.styles.textColor = [178, 34, 34];
          data.cell.styles.halign = "center";
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 40;

  // Separador suave rosa
  doc.setDrawColor(230, 210, 230);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 25;

  // Título para Difusión
  doc.setFontSize(16);
  doc.setTextColor(102, 51, 102);
  doc.text(`Difusión de ${grupo.name}`, margin, y);
  y += 30;

  // Tabla difusión sin totales P/A, solo total mujeres
  const rowsDifusion = generarFilas(mujeresDif);

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head,
    body: rowsDifusion,
    foot: [
      [
        { content: "Total de mujeres:", colSpan: 3, halign: "left" },
        { content: mujeresDif.length.toString(), halign: "center" },
        ...Array(fechasAsistencia.length - 1).fill({ content: "" }),
      ],
    ],
  });

  // Pie de página con fecha
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleDateString()}`, margin, pageHeight - 20);

  doc.save(
    `${grupo.name.replace(/\s+/g, "_")}_${grupo.periodoMesInicio}_${grupo.periodoMesFin}_${grupo.periodoAnio}.pdf`
  );
};

  const findDuplicates = () => {
    const map = {};
    women.forEach(w => {
      const key = `${w.nombre.toLowerCase()} ${w.apellido.toLowerCase()}`;
      if (!map[key]) map[key] = [];
      map[key].push(w);
    });
    const dups = Object.values(map).filter(group => group.length > 1);
    setDuplicados(dups);
    setShowDuplicatesSection(true);
  };

  const removeSelectedDuplicates = (groupIndex, selectedIds) => {
    const group = duplicados[groupIndex];
    const toRemove = group.filter(w => selectedIds.includes(w.id));
    setWomen(prev => prev.filter(w => !toRemove.some(r => r.id === w.id)));
    setDuplicados(prev => prev.filter((_, i) => i !== groupIndex));
    if (duplicados.length === 1) setShowDuplicatesSection(false);
  };

  const deleteGroup = (groupId) => {
    setConfirmAction({
      message: "¿Eliminar este grupo? Las mujeres quedarán sin grupo asignado.",
      onConfirm: () => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setWomen(prev => prev.map(w => w.grupo === groupId ? { ...w, grupo: null } : w));
        setMujeresEstadoGrupo(prev => {
          const copia = { ...prev };
          delete copia[groupId];
          return copia;
        });
        setConfirmAction(null);
      },
      onCancel: () => setConfirmAction(null)
    });
  };

  const saveProcess = () => {
    const now = new Date();
    const grupoEjemplo = groups[0];
    const carpetaNombre = grupoEjemplo ? `${grupoEjemplo.periodoMesInicio}-${grupoEjemplo.periodoMesFin} ${grupoEjemplo.periodoAnio}` : `Proceso ${now.getFullYear()}`;

    const pdfs = groups.map(grupo => {
      const pdfBlob = generarPDFBlob(grupo.id);
      return { nombre: `${grupo.name}.pdf`, blob: pdfBlob };
    });

    const nuevoProceso = {
      carpeta: carpetaNombre,
      fecha: now.toISOString(),
      pdfs
    };

    setProcesosGuardados(prev => [...prev, nuevoProceso]);
    localStorage.setItem('procesosGuardados', JSON.stringify([...procesosGuardados, nuevoProceso]));

    setMujeresEstadoGrupo({});
    setWomen(prev => prev.map(w => ({ ...w, grupo: null })));
    setAsistencia({});
    setFechasAsistencia(["6/5", "13/5", "20/5", "27/5", "3/6", "10/6", "17/6", "24/6"]);

    showMessage(`Proceso guardado en carpeta "${carpetaNombre}". PDFs generados automáticamente.`);
  };

  return (
    <div className="container">
      <ConfirmModal />
      <MessageModal />
      <BirthdayModal />
      <section className="card-section">
        <RegistroForm />
      </section>

      <section className="card-section">
        <h2>Listado General de Mujeres</h2>
        <ListadoGeneral />
      </section>

      <section className="card-section">
        <h2>Gestión de Duplicados</h2>
        <button className="btn btn-warning mb-3" onClick={findDuplicates}>Buscar Duplicados</button>
        {showDuplicatesSection && duplicados.length > 0 && (
          <div>
            {duplicados.map((group, index) => (
              <div key={index} className="mb-4 border p-3">
                <h4>Duplicados: {group[0].nombre} {group[0].apellido}</h4>
                <ul>
                  {group.map(w => (
                    <li key={w.id}>
                      <input type="checkbox" id={`dup-${w.id}`} />
                      <label htmlFor={`dup-${w.id}`}> {w.nombre} {w.apellido} (ID: {w.id})</label>
                    </li>
                  ))}
                </ul>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    const selectedIds = group
                      .filter(w => document.getElementById(`dup-${w.id}`).checked)
                      .map(w => w.id);
                    if (selectedIds.length === group.length) {
                      showMessage("Debes dejar al menos uno.");
                    } else {
                      removeSelectedDuplicates(index, selectedIds);
                    }
                  }}
                >
                  Eliminar Seleccionados
                </button>
              </div>
            ))}
          </div>
        )}
        {duplicados.length === 0 && showDuplicatesSection && <p>No hay duplicados.</p>}
      </section>

      <section className="card-section">
        <h2>Procesos Guardados</h2>
        {procesosGuardados.length === 0 ? (
          <p>No hay procesos guardados.</p>
        ) : (
          procesosGuardados.map((proceso, index) => (
            <div key={index} className="mb-4 border p-3">
              <h4>Carpeta: {proceso.carpeta} (Guardado: {new Date(proceso.fecha).toLocaleDateString()})</h4>
              <div className="d-flex flex-wrap gap-2">
                {proceso.pdfs.map((pdf, i) => (
                  <button
                    key={i}
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      const url = URL.createObjectURL(pdf.blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = pdf.nombre;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Descargar {pdf.nombre}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card-section">
        <h2>Gestión de Grupos</h2>
        <NuevoGrupoForm />
        <ListaGrupos />
        <EditarGrupo />
        {selectedGroupId && <>
          <TablaGrupo grupoId={selectedGroupId} tipo="normal" />
          <TablaGrupo grupoId={selectedGroupId} tipo="difusion" />
          <AsistenciaTabla grupoId={selectedGroupId} />
          <button className="btn btn-primary mt-3" onClick={() => exportarPDF(selectedGroupId)}>Exportar PDF</button>
        </>}
      </section>
    </div>
  );
}

export default App;
