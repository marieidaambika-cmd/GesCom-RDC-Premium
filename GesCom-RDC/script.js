const STORAGE_KEY = "gescomRdcPrototypeV1";
const initialData = {
  products: [
    {id:"p1",name:"Cahier 100 pages",buy:1800,sell:2500,qty:24},
    {id:"p2",name:"Stylo bleu",buy:300,sell:500,qty:50},
    {id:"p3",name:"Clé USB 32 Go",buy:9000,sell:12000,qty:8}
  ],
  sales: [],
  expenses: [],
  debts: []
};
let data = loadData();
const $ = id => document.getElementById(id);
const fmt = amount => `${Math.round(Number(amount)||0).toLocaleString("fr-FR")} FC`;
const todayISO = () => new Date().toISOString().slice(0,10);
const dateLabel = value => { if(!value) return "—"; const [y,m,d]=value.split("-"); return `${d}/${m}/${y}`; };
function loadData(){
  try { const saved=localStorage.getItem(STORAGE_KEY); return saved?JSON.parse(saved):structuredClone(initialData); }
  catch { return JSON.parse(JSON.stringify(initialData)); }
}
function saveData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); renderAll(); }
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); }
function showModal(id){ if(id==="saleModal") refreshProductOptions(); $(id).classList.add("open"); }
function closeModal(id){ $(id).classList.remove("open"); }
function goTo(view){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`view-${view}`));
  document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const labels={dashboard:"Tableau de bord",products:"Produits",sales:"Ventes",expenses:"Dépenses",debts:"Dettes clients",reports:"Rapports",premium:"Premium"};
  $("pageCrumb").textContent=labels[view]||"Tableau de bord";
  $("sidebar").classList.remove("open");
  if(view==="sales") renderSales(); if(view==="products") renderProducts(); if(view==="expenses") renderExpenses(); if(view==="debts") renderDebts(); if(view==="reports") renderReports();
}
function totalRevenue(){return data.sales.reduce((s,x)=>s+x.total,0);}
function totalCost(){return data.sales.reduce((s,x)=>s+x.cost,0);}
function totalExpenses(){return data.expenses.reduce((s,x)=>s+x.amount,0);}
function totalDebt(){return data.debts.reduce((s,x)=>s+x.remaining,0);}
function setEmpty(id,empty){$(id).style.display=empty?"block":"none";}
function renderDashboard(){
  $("statRevenue").textContent=fmt(totalRevenue());
  $("statProfit").textContent=fmt(totalRevenue()-totalCost()-totalExpenses());
  $("statStock").textContent=data.products.reduce((s,p)=>s+p.qty,0).toLocaleString("fr-FR");
  $("statDebts").textContent=fmt(totalDebt());
  $("navProductCount").textContent=data.products.length;
  const activity=[
    ...data.sales.map(x=>({name:x.product,date:x.date,amount:x.total,type:x.payment==="credit"?"Vente à crédit":"Vente"})),
    ...data.expenses.map(x=>({name:x.name,date:x.date,amount:-x.amount,type:"Dépense"}))
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  $("recentActivity").innerHTML=activity.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${dateLabel(x.date)}</td><td>${x.amount<0?"−":""}${fmt(Math.abs(x.amount))}</td><td><span class="badge ${x.type==="Dépense"?"low":x.type==="Vente à crédit"?"credit":"ok"}">${x.type}</span></td></tr>`).join("");
  setEmpty("recentEmpty",activity.length===0);
  const low=data.products.filter(p=>p.qty<=5);
  const insights=[];
  if(low.length) insights.push(`⚠️ ${low.length} produit(s) ont un stock faible : ${low.slice(0,3).map(p=>esc(p.name)).join(", ")}.`);
  if(totalDebt()>0) insights.push(`◷ Il reste ${fmt(totalDebt())} à recevoir des clients.`);
  if(data.sales.length===0) insights.push("✦ Enregistrez une vente pour commencer à suivre votre chiffre d’affaires.");
  else insights.push(`◆ ${data.sales.length} vente(s) enregistrée(s). Le bénéfice est une estimation basée sur les coûts saisis.`);
  if(data.expenses.length===0) insights.push("＋ Ajoutez vos dépenses pour obtenir une estimation plus complète du résultat.");
  $("insights").innerHTML=insights.map(t=>`<div class="insight"><span class="insight-icon">✦</span><span>${t}</span></div>`).join("");
}
function renderProducts(){
  const query=($("productSearch").value||"").trim().toLowerCase();
  const list=data.products.filter(p=>p.name.toLowerCase().includes(query));
  $("productsTable").innerHTML=list.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${fmt(p.buy)}</td><td>${fmt(p.sell)}</td><td><span class="badge ${p.qty<=5?"low":"ok"}">${p.qty} unité(s)</span></td><td>${fmt(p.sell-p.buy)}</td><td><button class="table-action" data-edit-product="${p.id}">Modifier</button><button class="table-action danger" data-delete-product="${p.id}">Supprimer</button></td></tr>`).join("");
  $("productSummary").textContent=`${data.products.length} produit(s) enregistré(s)`;
  setEmpty("productsEmpty",list.length===0);
}
function renderSales(){
  $("salesTable").innerHTML=[...data.sales].reverse().map(s=>`<tr><td>${dateLabel(s.date)}</td><td><strong>${esc(s.product)}</strong></td><td>${s.qty}</td><td>${fmt(s.total)}</td><td><span class="badge ${s.payment==="credit"?"credit":"ok"}">${s.payment==="credit"?"À crédit":"Comptant"}</span></td><td>${esc(s.customer||"—")}</td></tr>`).join("");
  setEmpty("salesEmpty",data.sales.length===0);
}
function renderExpenses(){
  $("expensesTable").innerHTML=[...data.expenses].reverse().map(e=>`<tr><td>${dateLabel(e.date)}</td><td><strong>${esc(e.name)}</strong></td><td>${esc(e.category)}</td><td>${fmt(e.amount)}</td><td><button class="table-action danger" data-delete-expense="${e.id}">Supprimer</button></td></tr>`).join("");
  $("expenseSummary").textContent=`${fmt(totalExpenses())} de dépenses enregistrées`;
  setEmpty("expensesEmpty",data.expenses.length===0);
}
function renderDebts(){
  $("debtsTable").innerHTML=data.debts.filter(d=>d.remaining>0).map(d=>`<tr><td><strong>${esc(d.customer)}</strong></td><td>${esc(d.product)}</td><td>${dateLabel(d.date)}</td><td>${fmt(d.total)}</td><td><strong>${fmt(d.remaining)}</strong></td><td><button class="table-action" data-pay-debt="${d.id}">Rembourser</button></td></tr>`).join("");
  setEmpty("debtsEmpty",data.debts.filter(d=>d.remaining>0).length===0);
}
function renderReports(){
  $("reportRevenue").textContent=fmt(totalRevenue());
  $("reportExpenses").textContent=fmt(totalExpenses());
  $("reportCost").textContent=fmt(totalCost());
  $("reportNet").textContent=fmt(totalRevenue()-totalCost()-totalExpenses());
}
function renderAll(){renderDashboard();renderProducts();renderSales();renderExpenses();renderDebts();renderReports();}
function refreshProductOptions(){
  $("saleProduct").innerHTML='<option value="">Choisir un produit</option>'+data.products.filter(p=>p.qty>0).map(p=>`<option value="${p.id}">${esc(p.name)} — ${fmt(p.sell)} (stock : ${p.qty})</option>`).join("");
  updateSalePreview();
}
function updateSalePreview(){
  const p=data.products.find(x=>x.id===$("saleProduct").value), qty=Math.max(1,Number($("saleQty").value)||1);
  $("salePreview").textContent=p?`Montant estimé : ${fmt(p.sell*qty)} · Stock disponible : ${p.qty} unité(s).`:"Sélectionnez un produit pour voir le montant.";
}
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.view)));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>showModal(b.dataset.open)));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(back=>back.addEventListener("click",e=>{if(e.target===back)back.classList.remove("open");}));
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("productSearch").addEventListener("input",renderProducts);
$("saleProduct").addEventListener("change",updateSalePreview);
$("saleQty").addEventListener("input",updateSalePreview);
$("productForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("productId").value, product={id:id||`p${Date.now()}`,name:$("productName").value.trim(),buy:Number($("productBuy").value),sell:Number($("productSell").value),qty:Number($("productQty").value)};
  if(!product.name||product.sell<0||product.buy<0||product.qty<0){toast("Vérifiez les champs.");return;}
  if(id){const index=data.products.findIndex(p=>p.id===id);if(index>=0)data.products[index]=product;}else data.products.push(product);
  saveData();closeModal("productModal");$("productForm").reset();$("productId").value="";$("productModalTitle").textContent="Ajouter un produit";toast("Produit enregistré.");
});
$("saleForm").addEventListener("submit",e=>{
  e.preventDefault();
  const p=data.products.find(x=>x.id===$("saleProduct").value),qty=Number($("saleQty").value),payment=$("salePayment").value,customer=$("saleCustomer").value.trim();
  if(!p){toast("Choisissez un produit.");return;}
  if(!Number.isInteger(qty)||qty<1||qty>p.qty){toast("Quantité invalide ou stock insuffisant.");return;}
  if(payment==="credit"&&!customer){toast("Indiquez le nom du client pour une vente à crédit.");return;}
  const total=p.sell*qty,cost=p.buy*qty,sale={id:`s${Date.now()}`,date:todayISO(),product:p.name,productId:p.id,qty,total,cost,payment,customer};
  p.qty-=qty;data.sales.push(sale);
  if(payment==="credit")data.debts.push({id:`d${Date.now()}`,saleId:sale.id,customer,product:p.name,date:todayISO(),total,remaining:total});
  saveData();closeModal("saleModal");$("saleForm").reset();$("saleQty").value=1;toast("Vente enregistrée.");
});
$("expenseForm").addEventListener("submit",e=>{
  e.preventDefault();const amount=Number($("expenseAmount").value),name=$("expenseName").value.trim();
  if(!name||!Number.isFinite(amount)||amount<=0){toast("Vérifiez les informations de la dépense.");return;}
  data.expenses.push({id:`e${Date.now()}`,date:todayISO(),name,category:$("expenseCategory").value,amount});
  saveData();closeModal("expenseModal");$("expenseForm").reset();toast("Dépense enregistrée.");
});
document.addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit-product]");
  if(edit){const p=data.products.find(x=>x.id===edit.dataset.editProduct);if(!p)return;$("productId").value=p.id;$("productName").value=p.name;$("productBuy").value=p.buy;$("productSell").value=p.sell;$("productQty").value=p.qty;$("productModalTitle").textContent="Modifier le produit";showModal("productModal");}
  const del=e.target.closest("[data-delete-product]");
  if(del){const p=data.products.find(x=>x.id===del.dataset.deleteProduct);if(!p)return;if(data.sales.some(s=>s.productId===p.id)){toast("Ce produit est lié à une vente et ne peut pas être supprimé.");return;}if(confirm(`Supprimer « ${p.name} » ?`)){data.products=data.products.filter(x=>x.id!==p.id);saveData();toast("Produit supprimé.");}}
  const delExpense=e.target.closest("[data-delete-expense]");
  if(delExpense&&confirm("Supprimer cette dépense ?")){data.expenses=data.expenses.filter(x=>x.id!==delExpense.dataset.deleteExpense);saveData();toast("Dépense supprimée.");}
  const pay=e.target.closest("[data-pay-debt]");
  if(pay){const d=data.debts.find(x=>x.id===pay.dataset.payDebt);if(!d)return;const answer=prompt(`Reste dû : ${fmt(d.remaining)}\nMontant du remboursement (FC) :`);if(answer===null)return;const amount=Number(answer);if(!Number.isFinite(amount)||amount<=0||amount>d.remaining){toast("Montant de remboursement invalide.");return;}d.remaining-=amount;saveData();toast("Remboursement enregistré.");}
});
$("resetDemo").addEventListener("click",()=>{if(confirm("Effacer les données de ce prototype et revenir aux exemples ?")){data=JSON.parse(JSON.stringify(initialData));saveData();toast("Démonstration réinitialisée.");goTo("dashboard");}});
$("printReport").addEventListener("click",()=>{goTo("reports");window.print();});
$("exportCsv").addEventListener("click",()=>{
  const rows=[["Produit","Prix achat FC","Prix vente FC","Stock","Marge unitaire FC"],...data.products.map(p=>[p.name,p.buy,p.sell,p.qty,p.sell-p.buy])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gescom-produits.csv";a.click();URL.revokeObjectURL(url);toast("Export CSV prêt.");
});
function showPremiumDemo(){
  alert("Merci pour votre intérêt pour GesCom RDC Premium !\n\nPrix proposé : 5 $ par mois.\n\nCeci est une démonstration scolaire : aucun paiement n’est effectué et aucun abonnement n’est activé pour le moment.");
}
$("premiumSubscribe").addEventListener("click",showPremiumDemo);
$("premiumSubscribe2").addEventListener("click",showPremiumDemo);
$("todayLabel").textContent=new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"}).format(new Date());
renderAll();
