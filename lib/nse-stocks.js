"use strict";
const NSE = [
  {symbol:"RELIANCE.NS",  name:"Reliance Industries",        sector:"Energy"},
  {symbol:"TCS.NS",        name:"Tata Consultancy Services",  sector:"IT"},
  {symbol:"HDFCBANK.NS",   name:"HDFC Bank",                  sector:"Banking"},
  {symbol:"ICICIBANK.NS",  name:"ICICI Bank",                 sector:"Banking"},
  {symbol:"INFY.NS",       name:"Infosys",                    sector:"IT"},
  {symbol:"HINDUNILVR.NS", name:"Hindustan Unilever",         sector:"FMCG"},
  {symbol:"ITC.NS",        name:"ITC Limited",                sector:"FMCG"},
  {symbol:"BAJFINANCE.NS", name:"Bajaj Finance",              sector:"Finance"},
  {symbol:"KOTAKBANK.NS",  name:"Kotak Mahindra Bank",        sector:"Banking"},
  {symbol:"LT.NS",         name:"Larsen & Toubro",            sector:"Infra"},
  {symbol:"HCLTECH.NS",    name:"HCL Technologies",           sector:"IT"},
  {symbol:"AXISBANK.NS",   name:"Axis Bank",                  sector:"Banking"},
  {symbol:"ASIANPAINT.NS", name:"Asian Paints",               sector:"Consumer"},
  {symbol:"MARUTI.NS",     name:"Maruti Suzuki",              sector:"Auto"},
  {symbol:"SUNPHARMA.NS",  name:"Sun Pharmaceutical",         sector:"Pharma"},
  {symbol:"TITAN.NS",      name:"Titan Company",              sector:"Consumer"},
  {symbol:"WIPRO.NS",      name:"Wipro",                      sector:"IT"},
  {symbol:"BAJAJFINSV.NS", name:"Bajaj Finserv",              sector:"Finance"},
  {symbol:"ONGC.NS",       name:"ONGC",                       sector:"Energy"},
  {symbol:"NTPC.NS",       name:"NTPC",                       sector:"Power"},
  {symbol:"POWERGRID.NS",  name:"Power Grid Corporation",     sector:"Power"},
  {symbol:"TECHM.NS",      name:"Tech Mahindra",              sector:"IT"},
  {symbol:"TATAMOTORS.NS", name:"Tata Motors",                sector:"Auto"},
  {symbol:"BHARTIARTL.NS", name:"Bharti Airtel",              sector:"Telecom"},
  {symbol:"TATASTEEL.NS",  name:"Tata Steel",                 sector:"Metals"},
  {symbol:"HINDALCO.NS",   name:"Hindalco Industries",        sector:"Metals"},
  {symbol:"JSWSTEEL.NS",   name:"JSW Steel",                  sector:"Metals"},
  {symbol:"SBILIFE.NS",    name:"SBI Life Insurance",         sector:"Insurance"},
  {symbol:"DRREDDY.NS",    name:"Dr. Reddy's Laboratories",   sector:"Pharma"},
  {symbol:"CIPLA.NS",      name:"Cipla",                      sector:"Pharma"},
  {symbol:"DIVISLAB.NS",   name:"Divi's Laboratories",        sector:"Pharma"},
  {symbol:"APOLLOHOSP.NS", name:"Apollo Hospitals",           sector:"Healthcare"},
  {symbol:"DLF.NS",        name:"DLF",                        sector:"Realty"},
  {symbol:"GODREJPROP.NS", name:"Godrej Properties",          sector:"Realty"},
  {symbol:"NESTLEIND.NS",  name:"Nestle India",               sector:"FMCG"},
  {symbol:"BRITANNIA.NS",  name:"Britannia Industries",       sector:"FMCG"},
  {symbol:"DABUR.NS",      name:"Dabur India",                sector:"FMCG"},
  {symbol:"PIDILITIND.NS", name:"Pidilite Industries",        sector:"Chemicals"},
  {symbol:"DEEPAKNTR.NS",  name:"Deepak Nitrite",             sector:"Chemicals"},
  {symbol:"ULTRACEMCO.NS", name:"UltraTech Cement",           sector:"Cement"},
  {symbol:"GRASIM.NS",     name:"Grasim Industries",          sector:"Cement"},
  {symbol:"AMBUJACEM.NS",  name:"Ambuja Cements",             sector:"Cement"},
  {symbol:"SBI.NS",        name:"State Bank of India",        sector:"Banking"},
  {symbol:"INDUSINDBK.NS", name:"IndusInd Bank",              sector:"Banking"},
  {symbol:"FEDERALBNK.NS", name:"Federal Bank",               sector:"Banking"},
  {symbol:"IDFCFIRSTB.NS", name:"IDFC First Bank",            sector:"Banking"},
  {symbol:"BAJAJ-AUTO.NS", name:"Bajaj Auto",                 sector:"Auto"},
  {symbol:"EICHERMOT.NS",  name:"Eicher Motors",              sector:"Auto"},
  {symbol:"HEROMOTOCO.NS", name:"Hero MotoCorp",              sector:"Auto"},
  {symbol:"TVSMOTORS.NS",  name:"TVS Motor Company",          sector:"Auto"},
  {symbol:"M&M.NS",        name:"Mahindra & Mahindra",        sector:"Auto"},
  {symbol:"POLYCAB.NS",    name:"Polycab India",              sector:"Capital Goods"},
  {symbol:"ABB.NS",        name:"ABB India",                  sector:"Capital Goods"},
  {symbol:"SIEMENS.NS",    name:"Siemens India",              sector:"Capital Goods"},
  {symbol:"HAVELLS.NS",    name:"Havells India",              sector:"Consumer"},
  {symbol:"VOLTAS.NS",     name:"Voltas",                     sector:"Consumer"},
  {symbol:"TATACONSUM.NS", name:"Tata Consumer Products",     sector:"FMCG"},
  {symbol:"MARICO.NS",     name:"Marico",                     sector:"FMCG"},
  {symbol:"COLPAL.NS",     name:"Colgate-Palmolive India",    sector:"FMCG"},
  {symbol:"BPCL.NS",       name:"BPCL",                       sector:"Energy"},
  {symbol:"IOC.NS",        name:"Indian Oil Corporation",     sector:"Energy"},
  {symbol:"COALINDIA.NS",  name:"Coal India",                 sector:"Mining"},
  {symbol:"ADANIENT.NS",   name:"Adani Enterprises",          sector:"Conglomerate"},
  {symbol:"ADANIPORTS.NS", name:"Adani Ports & SEZ",          sector:"Ports"},
  {symbol:"ADANIGREEN.NS", name:"Adani Green Energy",         sector:"Power"},
  {symbol:"ZOMATO.NS",     name:"Zomato",                     sector:"Internet"},
  {symbol:"NAUKRI.NS",     name:"Info Edge (Naukri)",         sector:"Internet"},
  {symbol:"INDIGO.NS",     name:"IndiGo (InterGlobe Aviation)",sector:"Aviation"},
  {symbol:"IRCTC.NS",      name:"IRCTC",                      sector:"Travel"},
  {symbol:"PFC.NS",        name:"Power Finance Corporation",  sector:"Finance"},
  {symbol:"RECLTD.NS",     name:"REC Limited",                sector:"Finance"},
  {symbol:"CHOLAFIN.NS",   name:"Cholamandalam Investment",   sector:"Finance"},
  {symbol:"MUTHOOTFIN.NS", name:"Muthoot Finance",            sector:"Finance"},
  {symbol:"HDFCLIFE.NS",   name:"HDFC Life Insurance",        sector:"Insurance"},
  {symbol:"ICICIGI.NS",    name:"ICICI Lombard General Ins",  sector:"Insurance"},
  {symbol:"VARUNBEV.NS",   name:"Varun Beverages",            sector:"Beverages"},
  {symbol:"UPL.NS",        name:"UPL",                        sector:"Chemicals"},
  {symbol:"TATACHEM.NS",   name:"Tata Chemicals",             sector:"Chemicals"},
  {symbol:"MAXHEALTH.NS",  name:"Max Healthcare",             sector:"Healthcare"},
];

function searchLocal(q = "") {
  if (!q || q.length < 2) return NSE.slice(0, 8);
  const u = q.toUpperCase().trim();
  return NSE.filter(s =>
    s.symbol.includes(u) ||
    s.name.toUpperCase().includes(u) ||
    s.sector.toUpperCase().includes(u)
  ).slice(0, 10);
}

function getBySymbol(sym) {
  return NSE.find(s => s.symbol === sym || s.symbol.replace(".NS","") === (sym||"").replace(".NS","")) || null;
}

module.exports = { NSE_STOCKS: NSE, searchLocal, getBySymbol };
