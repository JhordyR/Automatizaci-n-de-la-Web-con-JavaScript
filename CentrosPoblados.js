const fs = require('fs')
const path = require('path')

const puppeteer = require('puppeteer')
const delay = require('delay')
const { resourceUsage } = require('process')

const root = path.dirname(require.main.filename)

const configuracionNavegador = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1920,1080'],
    headless: false,
    defaultViewport: null,
}




const runCrawler = async () => {
    const pueblosTotales = []
    try {
        const browser = await puppeteer.launch(configuracionNavegador)
        const page = await browser.newPage()
        await page.goto('http://sige.inei.gob.pe/test/atlas/')


        console.log('Navegador abierto')
     

        //ALMACENAR SOLO CUSCO
        /////////////////////////////////////////
        let resultadosScrapper = await page.evaluate(() => {
            const select = document.getElementById('cboDepartamento')
            const ress = []
            for (const option of select) {
                if (['CUSCO'].includes(option.innerText)) {
                    ress.push({
                        region: option.innerText,
                        valueOption: option.value,
                        provincias: [],
                    })
                }
            }
            return ress
        })
/////////////////////////////////////
       
        //GUARDAR SOLO PROVINCIA ESPINAR
//////////////////////////////////////
        for (let i = 0; i < resultadosScrapper.length; i++) {
            await page.select('#cboDepartamento', resultadosScrapper[i].valueOption)
            await delay(500)

            resultadosScrapper[i].provincias = await page.evaluate(() => {
                const select = document.getElementById('cboProvincia')
                const ress = []
                for (const option of select) {
                    if(['ESPINAR'].includes(option.innerText)){
                    ress.push({
                        provincia: option.innerText,
                        valueOption: option.value,
                        distritos: [],
                    })
                }
                }
                return ress
            }) 
        }
/////////////////////////////////////        
        
        //GUARDAR TODOS LOS DISTRITOS DE LA PROVINCIA
//////////////////////////////////////
        for (let i = 0; i < resultadosScrapper.length; i++) {
            console.log(resultadosScrapper[i].region)
            //Seleccionar la departamento
            await page.select('#cboDepartamento', resultadosScrapper[i].valueOption)
            await delay(1000)

            //Recorrido por cada provincia para extraer los valores de los distritos
            for (let j = 0; j < resultadosScrapper[i].provincias.length ; j++) {
                await page.select('#cboProvincia', resultadosScrapper[i].provincias[j].valueOption)
                await delay(1000)
                resultadosScrapper[i].provincias[j].distritos = await page.evaluate(() => {
                    const select = document.getElementById('cboDistrito')
                    const ress = []
                    for (const option of select) {
                            ress.push({
                                distrito: option.innerText,
                                valueOption: option.value,
                                pueblos: [],
                            })
                    }
                    return ress
                })
             }
         }

/////////////////////////////////
//HASTA ESTA PARTE DEL CODIGO COMPILA NORMAL Y DA LOS RESULTADOS ESPERADOS
//SE PUEDE ELIMINAR EL CODIGO DE ABAJO Y COMPILAR Y COMPROBAR LOS RESULTADOS


         //CODIGO PARA AGREGAR TODOS LOS DATOS DE LOS PUEBLOS QUE SE ENCUENTRAN EN REGION CUSCO PROVINCIA ESPINAR ,TODOS LOS DISTRITOS
///////////////////////////////////////
        for (let i = 0; i < resultadosScrapper.length; i++) {
            //console.log(resultadosScrapper[i].region)
            //Seleccionar la departamento
            await page.select('#cboDepartamento', resultadosScrapper[i].valueOption)
            await delay(1000)

            //Recorrido por cada provincia para extraer los valores de los distritos
            for (let j = 0; j < resultadosScrapper[i].provincias.length ; j++) {
                //Seleccionas la provincia
                //console.log(resultadosScrapper[i].provincias[j].valueOption)
                await page.select('#cboProvincia', resultadosScrapper[i].provincias[j].valueOption)
                await delay(1000)

                for (let k = 0; k < resultadosScrapper[i].provincias[j].distritos.length ; k++) {   
                    await page.select('#cboDistrito', resultadosScrapper[i].provincias[j].distritos[k].valueOption)
                    await delay(1000)

                    for (let l = 1; l < resultadosScrapper[i].provincias[j].distritos[k].pueblos.length + 1; l++) {

                        await page.click(`#tblResultados > tbody > tr:nth-child(${l}) > td > a > li > u`)
                        await delay(2500)
                        await page.mouse.click(1106, 596, { button: 'left', clickCount: 2 })
                        await delay(2000)
                        await page.waitForSelector('[aria-describedby="tblArea_informacion_vnac"]')
                        await delay(1000)

                        resultadosScrapper[i].provincias[j].distritos[k].pueblos = await page.evaluate(() => {
                                const values = Array.from(document.querySelectorAll('[aria-describedby="tblArea_informacion_vnac"]'))
                                const keys = Array.from(document.querySelectorAll('[aria-describedby="tblArea_informacion_descripcion"]'))
                                const ress = {}
                                for (let m = 0; m < keys.length; m++) {
                                    ress[keys[m].innerText] = values[m].innerText
                                }
                                return ress
                            })
                            // Cerrar la tabla
                            await page.mouse.click(1287, 304, { button: 'left', clickCount: 1 })
                            await delay(500)
                        }
                    }
               }
            }
 ///////////////////////////
            //NOTA:AVECES COMPILA Y DA RESULTADOS A VECES NO, SALE Error: Navigation timeout of 30000 ms exceeded, "LA MAYORIA DE LAS VECES"
            //El script en teoria deberia funcionar ya que solo estoy anidando el mismo codigo mostrado en clase modificandolo para este script.

        console.log('Navegador cerrado')
        await browser.close()
        return resultadosScrapper
        
    } catch (error) {
        throw new Error(error.message)
    }
}
(async () => {
    try {
         const pueblosTotales = await runCrawler()
        // Escribir un archivo json
        fs.writeFileSync('resultadoFinal.json', JSON.stringify(pueblosTotales))
    } catch (e) {
        console.log(e)
    }
})()
