(() => {
  "use strict";

  const STORAGE_KEY = "biblioteca-web-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const todayISO = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const shiftDate = (dateISO, days) => {
    const date = new Date(`${dateISO}T12:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const daysBetween = (from, to) => Math.floor((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
  const formatDate = value => value ? new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
  const escapeText = value => String(value ?? "");
  const createId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const normalize = value => String(value ?? "").trim().toLocaleLowerCase("es");
  const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

  function makeInitialState() {
    const today = todayISO();
    const books = [
      { id: "b1", titulo: "Cien años de soledad", autor: "Gabriel García Márquez", anio: 1967, genero: "Novela", coleccion: false, comentario: "Una saga familiar inolvidable." },
      { id: "b2", titulo: "Breves respuestas a las grandes preguntas", autor: "Stephen Hawking", anio: 2018, genero: "Ciencia", coleccion: false, comentario: "Preguntas esenciales sobre el universo." },
      { id: "b3", titulo: "Sapiens: De animales a dioses", autor: "Yuval Noah Harari", anio: 2011, genero: "Historia", coleccion: false, comentario: "Una mirada amplia a la historia humana." },
      { id: "b4", titulo: "El principito", autor: "Antoine de Saint-Exupéry", anio: 1943, genero: "Fantasía", coleccion: true, comentario: "Edición especial de colección." },
      { id: "b5", titulo: "La sombra del viento", autor: "Carlos Ruiz Zafón", anio: 2001, genero: "Misterio", coleccion: false, comentario: "Misterio entre libros y secretos." },
      { id: "b6", titulo: "Frida: Una biografía", autor: "Hayden Herrera", anio: 1983, genero: "Biografía", coleccion: false, comentario: "" },
      { id: "b7", titulo: "Veinte poemas de amor", autor: "Pablo Neruda", anio: 1924, genero: "Poesía", coleccion: true, comentario: "Ejemplar reservado para consulta." },
      { id: "b8", titulo: "Clean Code", autor: "Robert C. Martin", anio: 2008, genero: "Tecnología", coleccion: false, comentario: "Principios para escribir código claro." },
      { id: "b9", titulo: "El nombre de la rosa", autor: "Umberto Eco", anio: 1980, genero: "Novela", coleccion: false, comentario: "Una investigación en una abadía." }
    ];
    const loans = [
      { id: "p1", idLibro: "b1", persona: "Ana", fechaPrestamo: shiftDate(today, -20), fechaLimite: shiftDate(today, -6), fechaDevolucion: null },
      { id: "p2", idLibro: "b2", persona: "Carlos", fechaPrestamo: shiftDate(today, -3), fechaLimite: shiftDate(today, 11), fechaDevolucion: null },
      { id: "p3", idLibro: "b3", persona: "Lucía", fechaPrestamo: shiftDate(today, -24), fechaLimite: shiftDate(today, -10), fechaDevolucion: shiftDate(today, -12) },
      { id: "p4", idLibro: "b5", persona: "Mateo", fechaPrestamo: shiftDate(today, -19), fechaLimite: shiftDate(today, -5), fechaDevolucion: shiftDate(today, -3) }
    ];
    return { libros: books, prestamos: loans, tema: "claro", usuario: "Lector", orden: { campo: "titulo", direccion: "asc" } };
  }

  let state = loadState();
  let currentView = "catalogo";
  let currentFilter = "todos";
  let editingId = null;
  let modalOpen = null;
  let toastTimer = null;
  let lastFocusedElement = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return makeInitialState();
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.libros) || !Array.isArray(parsed.prestamos)) return makeInitialState();
      const validBookIds = new Set(parsed.libros.map(book => book.id));
      parsed.prestamos = parsed.prestamos.filter(loan => validBookIds.has(loan.idLibro));
      return {
        libros: parsed.libros,
        prestamos: parsed.prestamos,
        tema: parsed.tema === "oscuro" ? "oscuro" : "claro",
        usuario: typeof parsed.usuario === "string" && parsed.usuario.trim() ? parsed.usuario : "Lector",
        orden: { campo: ["titulo", "autor", "anio"].includes(parsed.orden?.campo) ? parsed.orden.campo : "titulo", direccion: parsed.orden?.direccion === "desc" ? "desc" : "asc" }
      };
    } catch {
      return makeInitialState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeLoan(bookId) {
    return state.prestamos.find(loan => loan.idLibro === bookId && loan.fechaDevolucion === null) || null;
  }

  function activeLoans() {
    return state.prestamos.filter(loan => loan.fechaDevolucion === null);
  }

  function isOverdue(loan, onDate = todayISO()) {
    return loan.fechaDevolucion === null && loan.fechaLimite < onDate;
  }

  function getBook(bookId) {
    return state.libros.find(book => book.id === bookId) || null;
  }

  function showMessage(message) {
    const toast = $("#page-message");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 4300);
  }

  function safeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setTheme() {
    const dark = state.tema === "oscuro";
    document.body.classList.toggle("dark", dark);
    $("#theme-icon").textContent = dark ? "☀" : "☾";
    $("#theme-label").textContent = dark ? "Tema claro" : "Tema oscuro";
    $("#theme-toggle-secondary").textContent = dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#141827" : "#f5f7fb");
  }

  function setView(view) {
    if (!["catalogo", "prestamos", "formulario", "resumen"].includes(view)) view = "catalogo";
    currentView = view;
    $$(".view").forEach(panel => panel.classList.toggle("active-view", panel.dataset.viewPanel === view));
    $$(".nav-link").forEach(link => {
      const active = link.dataset.view === view;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const titles = { catalogo: "Catálogo de libros", prestamos: "Mis préstamos", formulario: editingId ? "Editar libro" : "Agregar libro", resumen: "Resumen y ajustes" };
    $("#page-title").textContent = titles[view];
    renderAll();
    if (view === "formulario") setTimeout(() => $("#book-title").focus(), 30);
  }

  function getFilteredBooks() {
    const query = normalize($("#search-input").value);
    const genre = $("#genre-filter").value;
    const filtered = state.libros.filter(book => {
      const loan = activeLoan(book.id);
      const matchesSearch = !query || normalize(book.titulo).includes(query) || normalize(book.autor).includes(query);
      const matchesGenre = !genre || book.genero === genre;
      const matchesStatus = currentFilter === "todos" || (currentFilter === "disponibles" && !book.coleccion && !loan) || (currentFilter === "prestados" && Boolean(loan));
      return matchesSearch && matchesGenre && matchesStatus;
    });
    const { campo, direccion } = state.orden;
    return filtered.slice().sort((a, b) => {
      const result = campo === "anio" ? Number(a.anio) - Number(b.anio) : collator.compare(a[campo], b[campo]);
      return direccion === "desc" ? -result : result;
    });
  }

  function renderCatalog() {
    const grid = $("#catalog-grid");
    grid.replaceChildren();
    const books = getFilteredBooks();
    $("#catalog-count").textContent = `Mostrando ${books.length} de ${state.libros.length} libros`;
    $("#sort-by").value = state.orden.campo;
    $("#sort-direction").textContent = state.orden.direccion === "asc" ? "↑" : "↓";
    $("#sort-direction").setAttribute("aria-label", state.orden.direccion === "asc" ? "Orden ascendente" : "Orden descendente");
    const genres = [...new Set(state.libros.map(book => book.genero).filter(Boolean))].sort(collator.compare);
    const genreSelect = $("#genre-filter");
    const oldGenre = genreSelect.value;
    genreSelect.replaceChildren(new Option("Todos los géneros", ""));
    genres.forEach(genre => genreSelect.add(new Option(genre, genre)));
    genreSelect.value = genres.includes(oldGenre) ? oldGenre : "";

    books.forEach((book, index) => {
      const loan = activeLoan(book.id);
      const card = safeElement("article", `book-card${loan ? " is-loaned" : ""}${book.coleccion ? " is-collection" : ""}`);
      const top = safeElement("div", "book-top");
      const cover = safeElement("div", `book-cover cover-${index % 6}`, book.titulo.trim().charAt(0).toLocaleUpperCase("es"));
      cover.setAttribute("aria-hidden", "true");
      top.append(cover);
      const status = safeElement("span", `book-status${book.coleccion ? " collection" : loan ? " loaned" : ""}`, book.coleccion ? "De colección" : loan ? "Prestado" : "Disponible");
      top.append(status);
      card.append(top);
      card.append(safeElement("h3", "", book.titulo));
      card.append(safeElement("p", "book-author", `por ${book.autor}`));
      const meta = safeElement("div", "book-meta");
      meta.append(safeElement("span", "meta-chip", String(book.anio)));
      meta.append(safeElement("span", "meta-chip", book.genero));
      card.append(meta);
      if (book.comentario) {
        const comment = safeElement("p", "book-author", book.comentario);
        comment.classList.add("book-comment");
        card.append(comment);
      }
      if (loan) {
        const info = safeElement("p", "loan-info");
        const person = safeElement("strong", "", `Prestado a ${loan.persona}`);
        info.append(person, document.createTextNode(`Devolver antes del ${formatDate(loan.fechaLimite)}`));
        if (isOverdue(loan)) info.append(safeElement("span", "overdue-label", ` · Vencido ${daysBetween(loan.fechaLimite, todayISO())} días`));
        card.append(info);
      }
      const actions = safeElement("div", "book-actions");
      if (loan) {
        const returnButton = safeElement("button", "small-button action-primary", "Devolver");
        returnButton.type = "button";
        returnButton.addEventListener("click", () => returnLoan(loan.id));
        actions.append(returnButton);
      } else {
        const lendButton = safeElement("button", "small-button action-primary", book.coleccion ? "No prestable" : "Prestar");
        lendButton.type = "button";
        lendButton.disabled = book.coleccion;
        if (!book.coleccion) lendButton.addEventListener("click", () => openLoanModal(book.id));
        actions.append(lendButton);
      }
      const editButton = safeElement("button", "small-button", "Editar");
      editButton.type = "button";
      editButton.addEventListener("click", () => startEdit(book.id));
      actions.append(editButton);
      const deleteButton = safeElement("button", "small-button action-danger", "Eliminar");
      deleteButton.type = "button";
      deleteButton.addEventListener("click", () => openDeleteModal(book.id));
      actions.append(deleteButton);
      card.append(actions);
      grid.append(card);
    });
    $("#catalog-empty").classList.toggle("hidden", books.length !== 0);
  }

  function renderLoans() {
    const activeContainer = $("#active-loans");
    activeContainer.replaceChildren();
    const active = activeLoans().slice().sort((a, b) => collator.compare(a.fechaLimite, b.fechaLimite));
    $("#active-loan-badge").textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
    $("#nav-loan-count").textContent = String(active.length);
    if (!active.length) activeContainer.append(safeElement("div", "empty-inline", "No hay préstamos activos. ¡Todos los libros están al día!"));
    active.forEach(loan => {
      const book = getBook(loan.idLibro);
      if (!book) return;
      const item = safeElement("article", "loan-item");
      item.append(safeElement("div", "loan-book-icon", "▤"));
      const details = safeElement("div", "loan-details");
      details.append(safeElement("h3", "", book.titulo));
      details.append(safeElement("p", "", `Prestado a ${loan.persona}`));
      const late = isOverdue(loan);
      const deadline = safeElement("div", `loan-deadline${late ? " overdue-text" : ""}`, `Fecha límite: ${formatDate(loan.fechaLimite)}${late ? ` · Vencido por ${daysBetween(loan.fechaLimite, todayISO())} días` : ""}`);
      details.append(deadline);
      item.append(details);
      if (late) item.append(safeElement("span", "result-tag late", "VENCIDO"));
      const button = safeElement("button", "small-button action-primary", "Devolver");
      button.type = "button";
      button.addEventListener("click", () => returnLoan(loan.id));
      item.append(button);
      activeContainer.append(item);
    });

    const historyContainer = $("#loan-history");
    historyContainer.replaceChildren();
    const history = state.prestamos.filter(loan => loan.fechaDevolucion !== null).slice().sort((a, b) => collator.compare(b.fechaDevolucion, a.fechaDevolucion));
    if (!history.length) historyContainer.append(safeElement("div", "empty-inline", "Todavía no hay préstamos devueltos en el historial."));
    history.forEach(loan => {
      const book = getBook(loan.idLibro);
      if (!book) return;
      const item = safeElement("article", "history-item");
      item.append(safeElement("div", "loan-book-icon", "✓"));
      const main = safeElement("div", "history-main");
      main.append(safeElement("h3", "", book.titulo));
      main.append(safeElement("p", "", `Prestado a ${loan.persona}`));
      const dates = safeElement("div", "history-dates");
      dates.append(safeElement("span", "", `Préstamo: ${formatDate(loan.fechaPrestamo)}`));
      dates.append(safeElement("span", "", `Devolución: ${formatDate(loan.fechaDevolucion)}`));
      main.append(dates);
      item.append(main);
      const daysLate = daysBetween(loan.fechaLimite, loan.fechaDevolucion);
      const result = daysLate > 0 ? `Con retraso: ${daysLate} día${daysLate === 1 ? "" : "s"}` : "Devuelto a tiempo";
      item.append(safeElement("span", `result-tag ${daysLate > 0 ? "late" : "on-time"}`, result));
      historyContainer.append(item);
    });
  }

  function renderStats() {
    const active = activeLoans();
    const available = state.libros.filter(book => !book.coleccion && !activeLoan(book.id)).length;
    const overdue = active.filter(isOverdue).length;
    const stats = [
      ["Total de libros", state.libros.length, "En el catálogo", "▤"],
      ["Disponibles", available, "Listos para préstamo", "✓"],
      ["Prestados", active.length, "Préstamos activos", "↗"],
      ["Vencidos", overdue, "Requieren seguimiento", "⌛"]
    ];
    const container = $("#stats-grid");
    container.replaceChildren();
    stats.forEach(([label, value, foot, icon]) => {
      const card = safeElement("article", "stat-card");
      const top = safeElement("div", "stat-top");
      top.append(safeElement("span", "", label), safeElement("span", "stat-icon", icon));
      card.append(top, safeElement("div", "stat-number", String(value)), safeElement("div", "stat-foot", foot));
      container.append(card);
    });
    const counts = new Map();
    state.libros.forEach(book => counts.set(book.genero, (counts.get(book.genero) || 0) + 1));
    const genres = [...counts.entries()].sort((a, b) => collator.compare(a[0], b[0]));
    const genreContainer = $("#genre-summary");
    genreContainer.replaceChildren();
    if (!genres.length) genreContainer.append(safeElement("div", "empty-inline", "No hay géneros que mostrar."));
    const max = Math.max(1, ...genres.map(([, count]) => count));
    genres.forEach(([genre, count]) => {
      const row = safeElement("div", "genre-row");
      row.append(safeElement("span", "genre-name", genre));
      const track = safeElement("div", "bar-track");
      const fill = safeElement("div", "bar-fill");
      fill.style.setProperty("--bar-width", `${count / max * 100}%`);
      track.append(fill);
      row.append(track, safeElement("span", "genre-value", String(count)));
      genreContainer.append(row);
    });
  }

  function renderProfile() {
    $("#greeting").textContent = `Hola, ${state.usuario}`;
    $("#user-name").value = state.usuario === "Lector" ? "" : state.usuario;
    const initial = state.usuario.trim().charAt(0).toLocaleUpperCase("es") || "L";
    $(".avatar").textContent = initial;
  }

  function renderAll() {
    setTheme();
    renderCatalog();
    renderLoans();
    renderStats();
    renderProfile();
    if (currentView === "formulario") $("#page-title").textContent = editingId ? "Editar libro" : "Agregar libro";
  }

  function persistAndRender() {
    saveState();
    renderAll();
  }

  function openModal(id) {
    lastFocusedElement = document.activeElement;
    modalOpen = id;
    $(`#${id}`).classList.remove("hidden");
    const focusTarget = id === "loan-modal" ? $("#loan-person") : $(`#${id} .modal-close`);
    setTimeout(() => focusTarget.focus(), 0);
  }

  function closeModal() {
    if (!modalOpen) return;
    $(`#${modalOpen}`).classList.add("hidden");
    modalOpen = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function openLoanModal(bookId) {
    const book = getBook(bookId);
    if (!book || book.coleccion) return;
    const error = validateLoan(bookId, state.usuario);
    if (error && error !== "La persona debe tener entre 2 y 40 caracteres.") {
      showMessage(error);
      return;
    }
    $("#loan-book-id").value = bookId;
    $("#loan-person").value = state.usuario === "Lector" ? "" : state.usuario;
    $("#loan-error").textContent = "";
    $("#loan-modal-description").textContent = `«${book.titulo}» se prestará por 14 días.`;
    openModal("loan-modal");
  }

  function validateLoan(bookId, person) {
    const book = getBook(bookId);
    if (!book) return "El libro ya no existe.";
    if (book.coleccion) return "Los libros de colección no se pueden prestar.";
    if (activeLoan(bookId)) return "Este libro ya tiene un préstamo activo.";
    if (activeLoans().length >= 3) return "Has alcanzado el máximo de 3 préstamos activos.";
    if (person !== undefined && (person.trim().length < 2 || person.trim().length > 40)) return "La persona debe tener entre 2 y 40 caracteres.";
    return "";
  }

  function returnLoan(loanId) {
    const loan = state.prestamos.find(item => item.id === loanId && item.fechaDevolucion === null);
    if (!loan) return;
    const today = todayISO();
    loan.fechaDevolucion = today;
    const lateDays = daysBetween(loan.fechaLimite, today);
    persistAndRender();
    showMessage(lateDays > 0 ? `Devolución registrada con ${lateDays} día${lateDays === 1 ? "" : "s"} de retraso.` : "Devolución registrada a tiempo. ¡Gracias!");
  }

  function openDeleteModal(bookId) {
    const book = getBook(bookId);
    if (!book) return;
    if (activeLoan(bookId)) {
      showMessage("No puedes eliminar un libro que tiene un préstamo activo.");
      return;
    }
    $("#delete-book-id").value = bookId;
    $("#confirm-delete").textContent = "Eliminar";
    $("#delete-modal-title").textContent = `¿Eliminar «${book.titulo}»?`;
    $("#delete-modal-copy").textContent = "También se eliminará su historial de préstamos devueltos.";
    openModal("delete-modal");
  }

  function deleteBook(bookId) {
    if (activeLoan(bookId)) {
      closeModal();
      showMessage("No puedes eliminar un libro que tiene un préstamo activo.");
      return;
    }
    state.libros = state.libros.filter(book => book.id !== bookId);
    state.prestamos = state.prestamos.filter(loan => loan.idLibro !== bookId);
    closeModal();
    persistAndRender();
    showMessage("Libro e historial eliminados.");
  }

  function clearFormErrors() {
    ["title", "author", "year", "genre", "comment"].forEach(name => $(`#error-${name}`).textContent = "");
    ["book-title", "book-author", "book-year", "book-genre", "book-comment"].forEach(id => $(`#${id}`).removeAttribute("aria-invalid"));
  }

  function validateBook(values, idBeingEdited) {
    const errors = {};
    if (values.titulo.length < 3 || values.titulo.length > 60) errors.title = "El título debe tener entre 3 y 60 caracteres.";
    if (!values.autor) errors.author = "El autor no puede estar vacío.";
    if (!Number.isInteger(values.anio) || values.anio < 1000 || values.anio > 2026) errors.year = "El año debe estar entre 1000 y 2026.";
    if (!values.genero) errors.genre = "Selecciona un género.";
    if (values.comentario.length > 120) errors.comment = "El comentario no puede superar 120 caracteres.";
    const duplicate = state.libros.some(book => book.id !== idBeingEdited && normalize(book.titulo) === normalize(values.titulo) && normalize(book.autor) === normalize(values.autor));
    if (duplicate) errors.title = "Ya existe un libro con ese título y autor.";
    const original = idBeingEdited ? getBook(idBeingEdited) : null;
    if (original && activeLoan(idBeingEdited) && values.coleccion) errors.collection = "No puedes marcar como colección un libro con préstamo activo.";
    return errors;
  }

  function startEdit(bookId) {
    const book = getBook(bookId);
    if (!book) return;
    editingId = bookId;
    clearFormErrors();
    $("#book-id").value = book.id;
    $("#book-title").value = book.titulo;
    $("#book-author").value = book.autor;
    $("#book-year").value = book.anio;
    ensureGenreOption(book.genero);
    $("#book-genre").value = book.genero;
    $("#book-comment").value = book.comentario || "";
    $("#book-collection").checked = Boolean(book.coleccion);
    $("#form-heading").textContent = "Editar libro";
    $("#form-submit").textContent = "Guardar cambios";
    $("#cancel-edit").classList.remove("hidden");
    $("#form-success").textContent = "";
    updateCommentCount();
    setView("formulario");
  }

  function ensureGenreOption(genre) {
    const select = $("#book-genre");
    if (![...select.options].some(option => option.value === genre)) select.add(new Option(genre, genre));
  }

  function resetForm() {
    editingId = null;
    $("#book-form").reset();
    $("#book-id").value = "";
    clearFormErrors();
    $("#form-heading").textContent = "Agregar un libro";
    $("#form-submit").textContent = "Guardar libro";
    $("#cancel-edit").classList.add("hidden");
    $("#form-success").textContent = "";
    updateCommentCount();
    if (currentView === "formulario") $("#page-title").textContent = "Agregar libro";
  }

  function updateCommentCount() {
    const remaining = 120 - $("#book-comment").value.length;
    $("#comment-count").textContent = `${remaining} caracteres restantes`;
  }

  function submitBook(event) {
    event.preventDefault();
    clearFormErrors();
    $("#form-success").textContent = "";
    const values = {
      titulo: $("#book-title").value.trim(),
      autor: $("#book-author").value.trim(),
      anio: Number($("#book-year").value),
      genero: $("#book-genre").value,
      comentario: $("#book-comment").value.trim(),
      coleccion: $("#book-collection").checked
    };
    const errors = validateBook(values, editingId);
    const mapping = { title: "book-title", author: "book-author", year: "book-year", genre: "book-genre", comment: "book-comment" };
    Object.entries(errors).forEach(([key, message]) => {
      const errorTarget = $(`#error-${key}`);
      if (errorTarget) errorTarget.textContent = message;
      const fieldId = mapping[key];
      if (fieldId) $(`#${fieldId}`).setAttribute("aria-invalid", "true");
    });
    if (Object.keys(errors).length) {
      const firstKey = Object.keys(errors)[0];
      if (mapping[firstKey]) $(`#${mapping[firstKey]}`).focus();
      else showMessage(errors[firstKey]);
      return;
    }
    if (editingId) {
      const book = getBook(editingId);
      if (!book) {
        resetForm();
        showMessage("El libro ya no existe.");
        return;
      }
      Object.assign(book, values);
      $("#form-success").textContent = "Cambios guardados correctamente.";
    } else {
      state.libros.push({ id: createId("libro"), ...values });
      $("#form-success").textContent = "Libro agregado correctamente.";
    }
    persistAndRender();
    const success = $("#form-success").textContent;
    resetForm();
    $("#form-success").textContent = success;
    showMessage(success);
    setView("catalogo");
  }

  function toggleTheme() {
    state.tema = state.tema === "oscuro" ? "claro" : "oscuro";
    persistAndRender();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      if (modalOpen) {
        closeModal();
        return;
      }
      if (currentView === "formulario" && (editingId || $("#book-title").value || $("#book-author").value || $("#book-comment").value)) {
        resetForm();
        showMessage("Formulario limpiado.");
      }
    }
  }

  function resetLibrary() {
    state = makeInitialState();
    currentFilter = "todos";
    $("#search-input").value = "";
    $("#genre-filter").value = "";
    $$(".filter-button").forEach(button => button.classList.toggle("selected", button.dataset.filter === "todos"));
    resetForm();
    persistAndRender();
    showMessage("Biblioteca restablecida con los datos iniciales.");
  }

  $$(".nav-link").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    if (editingId && link.dataset.view !== "formulario") resetForm();
    setView(link.dataset.view);
  }));
  $$("[data-go]").forEach(button => button.addEventListener("click", () => {
    resetForm();
    setView(button.dataset.go);
  }));
  $("#search-input").addEventListener("input", renderCatalog);
  $("#genre-filter").addEventListener("change", renderCatalog);
  $$(".filter-button").forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    $$(".filter-button").forEach(item => item.classList.toggle("selected", item === button));
    renderCatalog();
  }));
  $("#sort-by").addEventListener("change", event => {
    state.orden.campo = event.target.value;
    saveState();
    renderCatalog();
  });
  $("#sort-direction").addEventListener("click", () => {
    state.orden.direccion = state.orden.direccion === "asc" ? "desc" : "asc";
    saveState();
    renderCatalog();
  });
  $("#book-form").addEventListener("submit", submitBook);
  $("#book-comment").addEventListener("input", updateCommentCount);
  $("#cancel-edit").addEventListener("click", () => {
    resetForm();
    showMessage("Edición cancelada.");
  });
  $("#loan-form").addEventListener("submit", event => {
    event.preventDefault();
    const bookId = $("#loan-book-id").value;
    const person = $("#loan-person").value.trim();
    const validation = validateLoan(bookId, person);
    if (validation) {
      $("#loan-error").textContent = validation;
      $("#loan-person").setAttribute("aria-invalid", "true");
      $("#loan-person").focus();
      return;
    }
    const today = todayISO();
    state.prestamos.push({ id: createId("prestamo"), idLibro: bookId, persona: person, fechaPrestamo: today, fechaLimite: shiftDate(today, 14), fechaDevolucion: null });
    closeModal();
    persistAndRender();
    showMessage(`Préstamo registrado para ${person}.`);
  });
  $$("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
  $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("mousedown", event => {
    if (event.target === backdrop) closeModal();
  }));
  $("#confirm-delete").addEventListener("click", () => {
    const id = $("#delete-book-id").value;
    if (id === "__reset__") {
      closeModal();
      $("#confirm-delete").textContent = "Eliminar";
      resetLibrary();
    } else {
      deleteBook(id);
    }
  });
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $("#theme-toggle-secondary").addEventListener("click", toggleTheme);
  $("#profile-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#user-name").value.trim();
    if (!name) {
      $("#profile-message").textContent = "Escribe un nombre antes de guardar.";
      $("#user-name").focus();
      return;
    }
    state.usuario = name.slice(0, 40);
    saveState();
    renderProfile();
    $("#profile-message").textContent = "Nombre guardado correctamente.";
    showMessage(`¡Hola, ${state.usuario}! Tu nombre se guardó.`);
  });
  $("#reset-library").addEventListener("click", () => {
    $("#delete-modal-title").textContent = "¿Restablecer la biblioteca?";
    $("#delete-modal-copy").textContent = "Se reemplazarán los libros, préstamos, tema, nombre y orden guardados por los valores iniciales.";
    $("#delete-book-id").value = "__reset__";
    $("#confirm-delete").textContent = "Restablecer";
    openModal("delete-modal");
  });
  document.addEventListener("keydown", handleKeydown);

  renderAll();
  setView("catalogo");
})();