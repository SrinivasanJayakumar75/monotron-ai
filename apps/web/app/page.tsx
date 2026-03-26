import {Hero} from "./sections/hero"
import { ProductShowcase } from "./sections/productShowcase"
import { Footer } from "./sections/footer"
import FeaturesSection from "./sections/featureSection"
import FeatureIn from "./sections/FeatureIn"
import Script from "next/script";



export default function Page  () {
    return (

    <>
    <Script
      src="https://monotron-ai-widgets-mupe.vercel.app/widget.js"
      data-organization-id="org_35KsEwMA4r8vLk2ftDJvzdlqsd7"
      strategy="afterInteractive"
    />
         <Hero/>
        <ProductShowcase/>
        <FeaturesSection/>
        <FeatureIn/>
        <Footer/>
        
        

    </>)
}