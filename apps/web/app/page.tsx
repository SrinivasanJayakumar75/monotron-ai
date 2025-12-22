import { Header } from "./sections/header"
import {Hero} from "./sections/hero"
import { LogoTicker } from "./sections/logoTicker"
import { ProductShowcase } from "./sections/productShowcase"
import { Footer } from "./sections/footer"
import FeaturesSection from "./sections/featureSection"
import FeatureIn from "./sections/FeatureIn"
import Script from "next/script";

export default function Page  () {
    return (
    <>
         <Hero/>
        <ProductShowcase/>
        <FeaturesSection/>
        <FeatureIn/>
        <Footer/>
        

    </>)
}