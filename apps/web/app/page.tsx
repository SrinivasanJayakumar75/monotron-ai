import { Header } from "./sections/header"
import {Hero} from "./sections/hero"
import { LogoTicker } from "./sections/logoTicker"
import { ProductShowcase } from "./sections/productShowcase"
import { Footer } from "./sections/footer"
import FeaturesSection from "./sections/featureSection"
import FeatureIn from "./sections/FeatureIn"

export default function page  () {
    return (
    <>
    <script src="http://localhost:3001/widget.js" data-organization-id="org_35KsEwMA4r8vLk2ftDJvzdlqsd7"></script>
        
        <Hero/>
        <ProductShowcase/>
        <FeaturesSection/>
        <FeatureIn/>
        <Footer/>
        

    </>)
}