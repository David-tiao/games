import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {translateText} from './translations';

export type Language='zh'|'en';
const STORAGE_KEY='go_school_language_v1';
interface TranslationContextValue {
  lang:Language;
  setLang:(language:Language)=>void;
  tr:(value:string)=>string;
}
const Context=createContext<TranslationContextValue|null>(null);
const initialLanguage=():Language=>{
  try{return localStorage.getItem(STORAGE_KEY)==='en'?'en':'zh'}catch{return 'zh'}
};
export function LanguageProvider({children}:{children:ReactNode}){
  const [lang,setLang]=useState<Language>(initialLanguage);
  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,lang)}catch{/* storage may be disabled */}
    document.documentElement.lang=lang==='en'?'en':'zh-CN';
    document.title=lang==='en'?'Go Academy · AI Tutor & Multiplayer':'围棋学堂 · AI 教学与真人联网';
  },[lang]);
  const tr=useCallback((value:string)=>translateText(value,lang),[lang]);
  const value=useMemo(()=>({lang,setLang,tr}),[lang,tr]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage():TranslationContextValue{
  const context=useContext(Context);
  if(!context)throw new Error('useLanguage must be called within LanguageProvider');
  return context;
}
