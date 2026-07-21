const STORAGE_KEY = "dulceGestionDemoV1";

const seed = {
  products: [
    {id:1,name:"Pastel de chocolate",category:"Pasteles",price:620,emoji:"🍫",active:true},
    {id:2,name:"Pastel frutos rojos",category:"Pasteles",price:690,emoji:"🍓",active:true},
    {id:3,name:"Cupcakes decorados",category:"Cupcakes",price:360,emoji:"🧁",active:true},
    {id:4,name:"Cheesecake clásico",category:"Postres",price:480,emoji:"🍰",active:true},
    {id:5,name:"Galletas personalizadas",category:"Galletas",price:280,emoji:"🍪",active:true},
    {id:6,name:"Mesa de postres",category:"Eventos",price:1850,emoji:"✨",active:true}
  ],
  clients: [
    {id:1,name:"Mariana López",phone:"55 1200 3488",email:"mariana@email.com"},
    {id:2,name:"Sofía Hernández",phone:"55 3012 2271",email:"sofia@email.com"},
    {id:3,name:"Carlos Medina",phone:"55 7621 8804",email:"carlos@email.com"}
  ],
  inventory: [
    {id:1,name:"Harina",unit:"kg",stock:18,min:8,max:30},
    {id:2,name:"Azúcar",unit:"kg",stock:7,min:8,max:25},
    {id:3,name:"Chocolate",unit:"kg",stock:4,min:5,max:15},
    {id:4,name:"Crema para batir",unit:"L",stock:12,min:6,max:18},
    {id:5,name:"Huevos",unit:"pzas",stock:64,min:30,max:100},
    {id:6,name:"Cajas para pastel",unit:"pzas",stock:9,min:12,max:40}
  ],
  orders: [
    {id:1001,client:"Mariana López",phone:"55 1200 3488",productId:2,date:futureDate(1),deposit:300,status:"En preparación",notes:"Decoración rosa, mensaje: Feliz cumpleaños Ana"},
    {id:1002,client:"Sofía Hernández",phone:"55 3012 2271",productId:3,date:futureDate(2),deposit:180,status:"Pendiente",notes:"12 cupcakes en tonos pastel"},
    {id:1003,client:"Carlos Medina",phone:"55 7621 8804",productId:1,date:todayISO(),deposit:620,status:"Entregado",notes:"Sin nuez"},
    {id:1004,client:"Andrea Torres",phone:"55 4420 1990",productId:5,date:futureDate(4),deposit:100,status:"Listo",notes:"30 galletas con iniciales"}
  ]
};

function todayISO(){
  return new Date().toISOString().slice(0,10);
}
function futureDate(days){
  const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10);
}
function loadData(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw) return JSON.parse(raw);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));
  return structuredClone(seed);
}
let db=loadData();
let simpleMode=null;

const money = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
const formatDate = iso => new Date(iso+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
const productById=id=>db.products.find(p=>p.id===Number(id));

function statusClass(status){
  return {
    "Pendiente":"pending","En preparación":"prep","Listo":"ready","Entregado":"done","Cancelado":"cancelled"
  }[status]||"pending";
}
function badge(status){return `<span class="badge ${statusClass(status)}">${status}</span>`}
function toast(msg){
  const el=document.getElementById("toast"); el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function openModal(id){document.getElementById(id).classList.add("open")}
function closeModal(id){document.getElementById(id).classList.remove("open")}

function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===id));
  document.getElementById(id).classList.add("active");
  const titles={dashboard:"Resumen general",pedidos:"Gestión de pedidos",productos:"Catálogo de productos",clientes:"Directorio de clientes",inventario:"Control de inventario"};
  document.getElementById("page-title").textContent=titles[id];
  renderAll();
}

function renderDashboard(){
  const today=todayISO();
  const deliveredToday=db.orders.filter(o=>o.date===today&&o.status==="Entregado");
  const sales=deliveredToday.reduce((sum,o)=>sum+(productById(o.productId)?.price||0),0);
  document.getElementById("sales-today").textContent=money(sales);
  document.getElementById("pending-count").textContent=db.orders.filter(o=>["Pendiente","En preparación","Listo"].includes(o.status)).length;
  const limit=new Date();limit.setDate(limit.getDate()+3);
  document.getElementById("upcoming-count").textContent=db.orders.filter(o=>{
    const d=new Date(o.date+"T12:00:00");
    return d>=new Date(today+"T00:00:00")&&d<=limit&&!["Entregado","Cancelado"].includes(o.status);
  }).length;
  document.getElementById("product-count").textContent=db.products.filter(p=>p.active).length;

  const recent=[...db.orders].sort((a,b)=>b.id-a.id).slice(0,5);
  document.getElementById("recent-orders").innerHTML=recent.map(o=>{
    const p=productById(o.productId);
    return `<div class="order-mini">
      <div><strong>#${o.id} · ${o.client}</strong><small>${p?.name||"Producto"} · ${formatDate(o.date)}</small></div>
      <div>${badge(o.status)}</div>
    </div>`
  }).join("")||'<div class="empty">No hay pedidos.</div>';

  const alerts=[...db.inventory].sort((a,b)=>(a.stock/a.min)-(b.stock/b.min)).slice(0,5);
  document.getElementById("inventory-alerts").innerHTML=alerts.map(i=>`
    <div class="alert-item">
      <div><strong>${i.name}</strong><small>Mínimo recomendado: ${i.min} ${i.unit}</small></div>
      <div class="${i.stock<=i.min?'low':'ok'}">${i.stock} ${i.unit}</div>
    </div>`).join("");
}

function renderOrders(){
  const q=document.getElementById("order-search").value.toLowerCase();
  const f=document.getElementById("order-filter").value;
  const rows=db.orders.filter(o=>{
    const p=productById(o.productId);
    const matches=[o.id,o.client,p?.name,o.phone].join(" ").toLowerCase().includes(q);
    return matches&&(f==="Todos"||o.status===f);
  }).sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById("orders-table").innerHTML=rows.map(o=>{
    const p=productById(o.productId); const total=p?.price||0;
    return `<tr>
      <td><strong>#${o.id}</strong><small>Anticipo ${money(o.deposit)}</small></td>
      <td><strong>${o.client}</strong><small>${o.phone}</small></td>
      <td>${p?.name||"Sin producto"}</td>
      <td>${formatDate(o.date)}</td>
      <td><strong>${money(total)}</strong><small>Saldo ${money(Math.max(total-o.deposit,0))}</small></td>
      <td>${badge(o.status)}</td>
      <td><div class="table-actions">
        <button class="icon-btn" onclick="editOrder(${o.id})" title="Editar">✎</button>
        <button class="icon-btn" onclick="advanceOrder(${o.id})" title="Avanzar estado">→</button>
        <button class="icon-btn" onclick="deleteOrder(${o.id})" title="Eliminar">🗑</button>
      </div></td>
    </tr>`;
  }).join("")||'<tr><td colspan="7"><div class="empty">No se encontraron pedidos.</div></td></tr>';
}

function renderProducts(){
  document.getElementById("products-grid").innerHTML=db.products.map(p=>`
    <article class="product-card">
      <div class="product-visual">${p.emoji}</div>
      <div class="product-body">
        <small class="muted">${p.category}</small>
        <h3>${p.name}</h3>
        <div class="product-meta"><strong>${money(p.price)}</strong><span class="badge done">${p.active?'Activo':'Inactivo'}</span></div>
      </div>
    </article>`).join("");
  populateProductSelect();
}

function clientStats(name){
  const orders=db.orders.filter(o=>o.client.toLowerCase()===name.toLowerCase()&&o.status!=="Cancelado");
  return {count:orders.length,total:orders.reduce((s,o)=>s+(productById(o.productId)?.price||0),0)}
}
function renderClients(){
  const q=document.getElementById("client-search").value.toLowerCase();
  const rows=db.clients.filter(c=>[c.name,c.phone,c.email].join(" ").toLowerCase().includes(q));
  document.getElementById("clients-table").innerHTML=rows.map(c=>{
    const s=clientStats(c.name);
    return `<tr><td><strong>${c.name}</strong></td><td>${c.phone}</td><td>${c.email||"—"}</td><td>${s.count}</td><td><strong>${money(s.total)}</strong></td></tr>`;
  }).join("")||'<tr><td colspan="5"><div class="empty">No se encontraron clientes.</div></td></tr>';
}
function renderInventory(){
  document.getElementById("inventory-grid").innerHTML=db.inventory.map(i=>{
    const pct=Math.min(100,Math.round((i.stock/i.max)*100));
    return `<article class="inventory-card">
      <div class="inventory-top"><div><small>Materia prima</small><h3>${i.name}</h3></div><strong class="${i.stock<=i.min?'low':'ok'}">${i.stock} ${i.unit}</strong></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <small>Mínimo ${i.min} ${i.unit} · Capacidad ${i.max} ${i.unit}</small>
    </article>`;
  }).join("");
}
function renderAll(){renderDashboard();renderOrders();renderProducts();renderClients();renderInventory()}

function populateProductSelect(){
  document.getElementById("order-product").innerHTML=db.products.filter(p=>p.active).map(p=>`<option value="${p.id}">${p.name} · ${money(p.price)}</option>`).join("");
}
function newOrder(){
  document.getElementById("order-modal-title").textContent="Nuevo pedido";
  document.getElementById("order-form").reset();
  document.getElementById("order-id").value="";
  document.getElementById("order-date").value=futureDate(1);
  document.getElementById("order-status").value="Pendiente";
  populateProductSelect(); openModal("order-modal");
}
window.editOrder=function(id){
  const o=db.orders.find(x=>x.id===id); if(!o)return;
  document.getElementById("order-modal-title").textContent=`Editar pedido #${o.id}`;
  document.getElementById("order-id").value=o.id;
  document.getElementById("order-client").value=o.client;
  document.getElementById("order-phone").value=o.phone;
  document.getElementById("order-product").value=o.productId;
  document.getElementById("order-date").value=o.date;
  document.getElementById("order-deposit").value=o.deposit;
  document.getElementById("order-status").value=o.status;
  document.getElementById("order-notes").value=o.notes||"";
  openModal("order-modal");
}
window.advanceOrder=function(id){
  const o=db.orders.find(x=>x.id===id); if(!o)return;
  const flow=["Pendiente","En preparación","Listo","Entregado"];
  const idx=flow.indexOf(o.status);
  if(idx>=0&&idx<flow.length-1){o.status=flow[idx+1];save();renderAll();toast(`Pedido #${id}: ${o.status}`)}
  else toast("El pedido ya no puede avanzar.");
}
window.deleteOrder=function(id){
  if(!confirm("¿Deseas eliminar este pedido?"))return;
  db.orders=db.orders.filter(o=>o.id!==id);save();renderAll();toast("Pedido eliminado.");
}

document.getElementById("order-form").addEventListener("submit",e=>{
  e.preventDefault();
  const idVal=document.getElementById("order-id").value;
  const payload={
    client:document.getElementById("order-client").value.trim(),
    phone:document.getElementById("order-phone").value.trim(),
    productId:Number(document.getElementById("order-product").value),
    date:document.getElementById("order-date").value,
    deposit:Number(document.getElementById("order-deposit").value||0),
    status:document.getElementById("order-status").value,
    notes:document.getElementById("order-notes").value.trim()
  };
  if(idVal){
    const idx=db.orders.findIndex(o=>o.id===Number(idVal)); db.orders[idx]={...db.orders[idx],...payload};
  }else{
    const next=Math.max(1000,...db.orders.map(o=>o.id))+1; db.orders.push({id:next,...payload});
    if(!db.clients.some(c=>c.name.toLowerCase()===payload.client.toLowerCase())){
      db.clients.push({id:Date.now(),name:payload.client,phone:payload.phone,email:""});
    }
  }
  save();renderAll();closeModal("order-modal");toast("Pedido guardado correctamente.");
});

function openSimple(mode){
  simpleMode=mode;
  const title=document.getElementById("simple-title");
  const fields=document.getElementById("simple-fields");
  if(mode==="product"){
    title.textContent="Nuevo producto";
    fields.innerHTML=`
      <label>Nombre<input name="name" required></label>
      <label>Categoría<input name="category" required></label>
      <label>Precio<input name="price" type="number" min="0" required></label>
      <label>Emoji<input name="emoji" value="🎂" maxlength="2"></label>`;
  }else if(mode==="client"){
    title.textContent="Nuevo cliente";
    fields.innerHTML=`
      <label>Nombre<input name="name" required></label>
      <label>Teléfono<input name="phone" required></label>
      <label class="full">Correo<input name="email" type="email"></label>`;
  }else{
    title.textContent="Nuevo insumo";
    fields.innerHTML=`
      <label>Insumo<input name="name" required></label>
      <label>Unidad<input name="unit" placeholder="kg, L, pzas" required></label>
      <label>Existencia<input name="stock" type="number" min="0" required></label>
      <label>Mínimo<input name="min" type="number" min="0" required></label>
      <label>Capacidad máxima<input name="max" type="number" min="1" required></label>`;
  }
  document.getElementById("simple-form").reset();
  openModal("simple-modal");
}
document.getElementById("simple-form").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.target);
  if(simpleMode==="product"){
    db.products.push({id:Date.now(),name:f.get("name"),category:f.get("category"),price:Number(f.get("price")),emoji:f.get("emoji")||"🎂",active:true});
  }else if(simpleMode==="client"){
    db.clients.push({id:Date.now(),name:f.get("name"),phone:f.get("phone"),email:f.get("email")||""});
  }else{
    db.inventory.push({id:Date.now(),name:f.get("name"),unit:f.get("unit"),stock:Number(f.get("stock")),min:Number(f.get("min")),max:Number(f.get("max"))});
  }
  save();renderAll();closeModal("simple-modal");toast("Registro guardado.");
});

document.querySelectorAll(".nav-item").forEach(n=>n.addEventListener("click",()=>showView(n.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
["new-order","new-order-top","hero-new-order"].forEach(id=>document.getElementById(id).addEventListener("click",newOrder));
document.getElementById("new-product").addEventListener("click",()=>openSimple("product"));
document.getElementById("new-client").addEventListener("click",()=>openSimple("client"));
document.getElementById("new-inventory").addEventListener("click",()=>openSimple("inventory"));
document.getElementById("order-search").addEventListener("input",renderOrders);
document.getElementById("order-filter").addEventListener("change",renderOrders);
document.getElementById("client-search").addEventListener("input",renderClients);
document.getElementById("today").textContent=new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"});
renderAll();
