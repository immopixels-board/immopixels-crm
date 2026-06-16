'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import AvatarCrop from '../components/AvatarCrop'
import DebugPanel from '../components/DebugPanel'
import BirthdayOverlay from '../components/BirthdayOverlay'
import BuchungenView from '../components/BuchungenView'
import MaklerEditor from '../components/MaklerEditor'
import TeamChat from '../components/TeamChat'
var GoogleCalendarView = dynamic(() => import('../components/GoogleCalendarView'), { ssr: false })
import CardModal from '../components/CardModal'
import TutorialOverlay from '../components/TutorialOverlay'
import Fahrtenbuch from '../components/Fahrtenbuch'
import AmeliaView from '../components/AmeliaView'
import ColumnModal, { PANTONE, getColStyle, ConfirmDialog } from '../components/ColumnModal'
import { supabase } from '../lib/supabase'

var CLAUDE_SVG = 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI1MDAiIHZpZXdCb3g9IjAgLS4wMSAzOS41IDM5LjUzIiB3aWR0aD0iMjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtNy43NSAyNi4yNyA3Ljc3LTQuMzYuMTMtLjM4LS4xMy0uMjFoLS4zOGwtMS4zLS4wOC00LjQ0LS4xMi0zLjg1LS4xNi0zLjczLS4yLS45NC0uMi0uODgtMS4xNi4wOS0uNTguNzktLjUzIDEuMTMuMSAyLjUuMTcgMy43NS4yNiAyLjcyLjE2IDQuMDMuNDJoLjY0bC4wOS0uMjYtLjIyLS4xNi0uMTctLjE2LTMuODgtMi42My00LjItMi43OC0yLjItMS42LTEuMTktLjgxLS42LS43Ni0uMjYtMS42NiAxLjA4LTEuMTkgMS40NS4xLjM3LjEgMS40NyAxLjEzIDMuMTQgMi40MyA0LjEgMy4wMi42LjUuMjQtLjE3LjAzLS4xMi0uMjctLjQ1LTIuMjMtNC4wMy0yLjM4LTQuMS0xLjA2LTEuNy0uMjgtMS4wMmMtLjEtLjQyLS4xNy0uNzctLjE3LTEuMmwxLjIzLTEuNjcuNjgtLjIyIDEuNjQuMjIuNjkuNiAxLjAyIDIuMzMgMS42NSAzLjY3IDIuNTYgNC45OS43NSAxLjQ4LjQgMS4zNy4xNS40MmguMjZ2LS4yNGwuMjEtMi44MS4zOS0zLjQ1LjM4LTQuNDQuMTMtMS4yNS42Mi0xLjUgMS4yMy0uODEuOTYuNDYuNzkgMS4xMy0uMTEuNzMtLjQ3IDMuMDUtLjkyIDQuNzgtLjYgMy4yaC4zNWwuNC0uNCAxLjYyLTIuMTUgMi43Mi0zLjQgMS4yLTEuMzUgMS40LTEuNDkuOS0uNzFoMS43bDEuMjUgMS44Ni0uNTYgMS45Mi0xLjc1IDIuMjItMS40NSAxLjg4LTIuMDggMi44LTEuMyAyLjI0LjEyLjE4LjMxLS4wMyA0LjctMSAyLjU0LS40NiAzLjAzLS41MiAxLjM3LjY0LjE1LjY1LS41NCAxLjMzLTMuMjQuOC0zLjguNzYtNS42NiAxLjM0LS4wNy4wNS4wOC4xIDIuNTUuMjQgMS4wOS4wNmgyLjY3bDQuOTcuMzcgMS4zLjg2Ljc4IDEuMDUtLjEzLjgtMiAxLjAyLTIuNy0uNjQtNi4zLTEuNS0yLjE2LS41NGgtLjN2LjE4bDEuOCAxLjc2IDMuMyAyLjk4IDQuMTMgMy44NC4yMS45NS0uNTMuNzUtLjU2LS4wOC0zLjYzLTIuNzMtMS40LTEuMjMtMy4xNy0yLjY3aC0uMjF2LjI4bC43MyAxLjA3IDMuODYgNS44LjIgMS43OC0uMjguNTgtMSAuMzUtMS4xLS4yLTIuMjYtMy4xNy0yLjMzLTMuNTctMS44OC0zLjItLjIzLjEzLTEuMTEgMTEuOTUtLjUyLjYxLTEuMi40Ni0xLS43Ni0uNTMtMS4yMy41My0yLjQzLjY0LTMuMTcuNTItMi41Mi40Ny0zLjEzLjI4LTEuMDQtLjAyLS4wNy0uMjMuMDMtMi4zNiAzLjI0LTMuNTkgNC44NS0yLjg0IDMuMDQtLjY4LjI3LTEuMTgtLjYxLjExLTEuMDkuNjYtLjk3IDMuOTMtNSAyLjM3LTMuMSAxLjUzLTEuNzktLjAxLS4yNmgtLjA5bC0xMC40NCA2Ljc4LTEuODYuMjQtLjgtLjc1LjEtMS4yMy4zOC0uNCAzLjE0LTIuMTZ6IiBmaWxsPSIjZDk3NzU3Ii8+PC9zdmc+'
var LOGO = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCADQANADASIAAhEBAxEB/8QAHAABAAIDAQEBAAAAAAAAAAAAAAYHBAUIAwIB/8QASBAAAQMCAgUHBg0CBQQDAAAAAQACAwQFBhEHEiExQRNRYXGBkbEUIjM2cqEjMjVCUmJ0g7KzwcLRCIIVJEOSoiVT4fFjc+L/xAAaAQACAwEBAAAAAAAAAAAAAAAABQIEBgMB/8QANBEAAgEDAQQHBgYDAAAAAAAAAAECAwQREgUhMVETNDVBcYHBIjJhctHwFFKRobHhFTNC/9oADAMBAAIRAxEAPwDjJERABERABERABFn2y01dcQ5jNSLjI7d2c6ktvsdFS5Oczl5B8542dgQBFaO3VlX6CB7m/SOxveVt6XDEhyNTUtb9Vgz95Uqp4ZZ5Ww08T5ZHHJrGNJJ6AAptYNFWMbqGvkoo7dE759Y/UP8AtGbu8BcqtanSWZySJRhKfuorCDD1tjHnsklP1n/xksuO2W+P4tHB2sB8Vfdp0G0jWtddb7PIfnMpogzLqc7PPuUjotEOCaf0tHVVf/3VLh+DVS+e2LaPBt+C+uDvGyqv4HM7aWmb8WnhHUwL8dS0rvjU0J62BdVxaNsDxnNuH4Dsy86R7vFy/JdGuB5Dm7D8A2ZebLI3wcuX+coflf7fUn+Aqc0cnyWu3P8AjUcI9luXgsSfDtukHmNkiP1X5+Oa6ortD+C6jPkaaspM/wDs1JOX+/WUau2gyEhzrTfntPzY6qEHvc0j8K7Q2xay4trxX0ISs6q+JzXVYZnaCaeoZJ0PGqVqKuhq6Q/5iB7B9LLMd+5Xpf8ARfjG0B0n+HCuhb/qUbuU/wCOx3uUMmjcx7opYy1wOq5rhkR0EJhTrU6qzBpleUZQeJIrVFMrhYaOpBdEPJ5Odnxe7+FGrjbKuhd8MzNnB7drT/C6HhhIiIAIiIAIiIAIiIAIi9KeGWombDCwve45ABAHzGx8jwxjS5zjkABmSpPZ8Psj1Zq4B794j4Dr51m2W1Q2+PWOT5yPOfzdAU3wLgy74uruRoY+SpYz8PVSDzI+jpd0D3DaoVKkacXKTwkexTk8Ij9FS1FXUR0lHTyTzSENjiiYXOceYAK2cFaGKqpayrxPUupIyMxSwEGQ+07aG9Qz7FaOCcGWTCdGI7fTh9S5uUtVIAZJO3gOge87VI1m7vbM5+zR3Ln3jKjZJb57zU4ew5Y8PwclaLbBS7MnPa3N7utx2ntK2yIkspSm8yeWXkklhBERRPQiIgAiIgAtLiXCtgxHEWXa2wzvyybMBqyN6nDb2blukUoTlB6ovDPHFSWGUHjTQ3cqBslXh2c3GnG3yeTJszR0Hc/3HoKquqgfFJJTVMLmPaS2SORuRB4ggrtBRTHmBLLi2nLqmIU1eBlHVxt88cwd9IdB7CE8tNsyj7NfeuZQrWSe+BxrecPjIz0A27zET4fwo24Fri1wIIORB4K5MZYVu+FLl5Jc4fMfmYZ2bY5QOIPPzjeFDb5Z465pliyZUAb+Dug/ytHCcZxUovKYtacXhkMRfc0b4ZXRStLHtORB4L4UgCIiACIiAPqNj5JGxsaXOccgBxKmtjtjLfBm7J07x57uboHQsHCttEUQrpm/CPHwYPzRz9vh1qxdHOEqrF1+ZRx60dJFk+qnA9GzmH1juHfwUKlSNOLnJ4SPYxcnpRn6LsBVeL6500zn01qgcBNMBtefoM6ec8O4HpK026htNvit9upo6amhbkyNgyHX0k8SdpS0W6jtNtgt1BA2CmgYGMY0bhz9JO8niVlrG319O6nyiuCHNCgqS+IREVEsBFnWS01t4rPJqKMOIGbnO2NYOclbHFeGn2CClfJVtndOXAtbHkG5Zcc9u/mC7Rt6kqbqJeyu8g6kVLTneaBFJcJYV/x6jmqPL/JuTk1NXkdfPYDn8Yc6+sWYT/wG3R1n+IeUa8wj1eR1MswTnnrHmXT8FX6LpdPs+KI9PDVozvIwiAEnIDMlSmxYJule1s1URRQnaNcZvI9n+clyo0KlaWmmskp1IwWZMiyK1aDA1ip2jlo5ap3EySEDubktk3DliaMhaqXtZn4ppDYldr2mkVXfQXBFMIrhqcJ4fnBDrdGwnjG4ty7io/dtHsZaX2usc13COfaD/cN3cudXY9xBZWH4Eo3lOXHcV8iy7pba62VHIV1O+F/Anc7pB3FYiVyi4vElhlpNNZRr8QWa3X61y226UzZ6eTgdhaeDmngRzrmfSNguvwfdOSl1p6CYnyapA2OH0XczhzdoXVC1+IrPQX6zz2u5Q8rTzDI8C08HA8CCr9hfytZYe+L4or3Fuqq+JxRiC1NrouViAFQwbPrDmKhrgWuLXAgg5EHgrkxxhmuwpf5bZWee348EwGQljO5w6eBHAqvsV20ZGvgb0SgfiWxhOM4qUXlMTNOLwyNoiKQBbCwUPl1e1rhnEzzpOrm7Vr1NsOUfkltYXDKSXz3foO5AG4oKSetrIKKkiMs8zxHExo2lxOQC6r0fYYpsKYchtsWq+c/CVMoHpJCNp6huHQFWP9OuFxNUT4pq482wkwUeY+cR57+wHIdbuZXesxtm71z6GPBcfH+hnZUdMdb7wiIkZfCIiALW0aUscGF4p2ga9Q973nLbscWge73rVaXfQW72pPBq3mjz1PofvPzHLR6XfQW72pPBq1NdJbNWOS9BVTebnzZkaJvker+0ftC9dJ/+YttFb4fhKqaqBjib8ZwDXAnvIWNoxnipcO3CpncGRRTF7jzANC2uFqSWsnkxFcGf5mpH+XYf9GHgB0kbf/ZRQXS2kKK/6X6LP3gKj01pTfceeEcJ01ojbU1QbPXEZ5kZtj6G9PSt5c7jRWyn5euqGQs4Z73dQ3lYGK7/AAWKh5RwElTJmIYs955z0BVNdLhV3KrdVVkzpZHc+5o5gOARc3lKwj0VJb/viFOjO4eub3E2uekNocW22g1hwfO7LP8AtH8rTyY7vznktdTMHM2LZ7yVF0SSptK5m8uePDcXo21KPcTGj0g3SNwFTS0s7eOqCxx7cyPcpVYsX2m6ObC55pah2wRy7AT0O3H3KpEXSjta4pve8r4kJ2lOS3LBelxoaW4UrqashbLE7gRuPODwKqrF+G57HUB7CZaOQ/BycW/Vd0+K22CcXS00sduukpfTnzY5nHbHzAn6Ph1KwLhSU9fRS0lSwPhlbk4fqOlOJwo7To6o7pL73/ApxlO1nh8CikWff7ZNaLrNQy7dQ5sd9Jp3FYCy84OEnGXFDVNNZRE9KOEosW4cfTxtaLhT5yUch2edxYTzO3deR4Llqpgcx8lPURFrmkskY8ZEHcQQu0VQH9QmGBbr5FiCki1aa4HVnyGxswG/+4besOTzYt3iXQS4PgUL2jla0c4XiiNDXPh26nxmE8WrDUxxVR+UW/lmjOSDzv7eP89ihy0otMyy03ldyhhIzbnrP6htVg0dPNV1cNJTsL5ppGxxtHFzjkB3lRbBcG2epI3ZMafef0VyaBLQLnj2KpkZrRW+J1Qc92t8Vvbmc/7Vyr1VRpym+5EoR1zUToDC9phsWH6G0U+WpSxBhI+c7e53aST2rZIiwUpOTcnxY/SSWEERF4ehERAFu6PPU+h+8/MctHpd9Bbvak8GreaPPU+h+8/MctHpd9Bbvak8GrVXHZq+WPoKafWfNmqwi011tjsrSdWrrdefI/6TGtJHacgrMmkipaZ8ryI4omFzjwa0BQHRJTB1VXVhHxGNjb/ccz+ELd6TK00uG3QsOTqmQR7Po7z4ZdqjYz6GzdZ8v44fv/J7XWutoRXOILnNd7rNWykgOOUbT8xo3BYCIszObnJylxY0SUVhBERRPQiIgArQ0a3l1fbHUFQ8unpQA0k7XM4d27uVXreYErHUeKKQg5NmdyLhzh2we/LuV7Z1w6NeL7nuZXuaeumyYaUraKi0x3FjfhKZ2q887HbPccu8qs1ed3phW2uqpCAeVicwZ85Gz3qjFb21RUKymv8Ar0OVlPMHHkFose2JmI8J19qLQZZIy6AnLzZW7WnPhtGR6CVvUSiE3CSlHii3KKksM4tlZkXRSNy3tc0jvCr+405pK6anOfmOyHSOHuV46ZLQLPpBuEbG6sNURVR7OD9ruzW1h2KpMZQalXDUAbJG6p6x/wC/ct7SqKrBTXeIJRcZOLNvheLkrPEctryXnvy8AF0V/TTb+SsN0uhG2oqWwt2cGNz8X+5UBbGcnbqZnNE3PryXUmg6lbTaNLa4DzpjLK7rMjgPcAlu2Z6bbHNr6+hZso5q55E2REWSHAREQAREQBbujz1PofvPzHLR6XfQW72pPBq3mjz1PofvPzHLR6XfQW72pPBq1Vx2avlj6Cmn1nzZk6JmAWWqk4uqdXua3+VjaXXERW1m3IukJ7NX+VlaJz/0OqbzVJP/ABavnSxTl9ppKkbopi0/3D/8rnJZ2Xu5epJPF1v+9xWyIizI0CIiACIiACyLY4tuVM5pyImYR3hY62GG6c1V/oYACQ6dmsOgHM+4FTpJuaS5kZPCbLtVD1rQysnYNzZHAd6vWaRsUL5XnJrGlx6gqGkcXvc873Ekp9t1rEF4+gvsF7x+IiLPDIpX+pm3tD7PdWtOsRJTyHLgMnN8Xrn/ABfFr2oSZbY5Ac+g7P1C6k/qGphNo+5XLbT1kcneHN/cuZr8zXs9S08GZ9239FsNkT1WqXLKE15HFVmVAAIWAbg0eC6w0XMbHo8sbW55Gka7bznafFcnwkGFhG4tHgusNFz2yaPbG5u4UjG9o2HwVfbv+mPj6HSw99+BJURFlxqEREAEREAW7o89T6H7z8xy0el30Fu9qTwat5o89T6H7z8xy0el30Fu9qTwatVcdmr5Y+gpp9Z82ZGib5Hq/tH7QpHiO3C62WpodgdIzNhPBw2j3hRzRN8j1f2j9oU0Viwgp2cYvg0c7huNZtFCSMfHI6ORpa9pLXA7wRwXyp5pHw44SPvNFHm07aljRuP0/wCe/nUDWVuraVvUcJDWlUVSOpBERVzqEREAFNdFdsdLXy3SRp5OBpjjPO8jb3DxUYsdqqrvXspKVmZO17zuY3nKuS00FPbLfFRUzco4xlmd7jxJ6SnGyLR1KnSy4L+SleVlGOhcWazHlcKHDNUQcnzjkWdJdv8AdmqgUo0jXltxuwpYH61PS5tzG5z/AJx/TsKi647VuFWrvHBbidrT0U9/eEREtLRDdNjOU0Y3gbsmxO7pmFcr3Ia1uqW88Lx7iuqNNb9TRheHZZ5tiHfMwfquV7kdW3VLuaF59xWq2H1eXj6IU33+xeAtr+Ut1M/nibn3LqTQfVNqdGltAOboTLE7rEjiPcQuUMMS8rZohxYSw9/8ELov+mm4iWwXS1kjWp6lsw58nty8We9T2zDVbZ5NfT1I2UsVccy2kRFkhwEREAEREAW7o89T6H7z8xy0el30Fu9qTwat5o89T6H7z8xy0el30Fu9qTwatVcdmr5Y+gpp9Z82ZGib5Hq/tH7Qt3iu8GyUlLVmPlI3VLY5Rx1S1x2dOwLSaJvker+0ftC9dK/q7T/a2/gevaVSVPZynHil6hOKlcYZKKOppq6lZUU0rJoZBmHDaD0f+FEMUYGjqXvq7Q5kMp2ugdsY4/VPDq3dSh2Hb/X2SfWpn68Lj8JC/wCK7+D0qyLFiy0XRrWGYUs53xTEDb0HcfHoUKd1bX8NFXdL74M9lSq28tUOBVlxtlwt0hZW0ksJzyzc3zT1HcViK/HAOaWuAIO8HisKS0WmQ5yWuieed1O0/oq9TYW/2J/qjpG//MikWNc94Yxpc47AAMyVJbFgy63BzX1LDRU/F0g889Td/fkrRp6Wmps/J6aGHPfybA3wXncK+it8PK1tTFAz67tp6hvPYulLYtOn7VWWV+hGV7KW6CPKyWmis9J5NRRaoO17ztc885KjuPcUMoYX2ygkzq3jKR7T6Ic3teC1eJsdSTtdTWYOiYdjqhwycfZHDr39ShDiXOLnEkk5kniud7tOEIdDb/r9CVC1k3rqH4iIs+MQiIgCuf6hqkQaPuSzGdRWRR9wc79q5mvr9Sz1LudmXfs/VXt/UzcG52a1Nd5w5SokHRsa0/jXP2LpdS1cnntkkA7Bt/RbDZENNqnzyxNeSzVZh4Ln9PTE8z2j3H9FcmgS8C2Y9ipZHARXCJ1Oc9wd8Zp68xl/cqEstT5Jc4ZScmZ6r+o7P/KsGhqZqKtgrKZ5jngkbJG4b2uacwe8K9XpKtTlB96OEJ6JqR2Yi12GbtBfbBRXeny5OqiD8gc9U7nN7DmOxbFYKUXFuL4ofpprKCIi8PQiIgC3dHnqfQ/efmOWj0u+gt3tSeDVvNHnqfQ/efmOWj0u+gt3tSeDVqrjs1fLH0FNPrPmzI0TfI9X9o/aF66V/V2n+1t/A9eWib5Hq/tH7QvXSv6u0/2tv4HqK7M8vU9fWvMrFERZcamfQ3m60IDaW4VETRuaHkt7jsWyZjPEbRka5rukws/hR5F2hc1oLEZNeZzdOEuKN1U4qxBUDJ9zlaP/AIwGfhAWomllmkMk0j5Hne57iSe0r4RRnVqVPfk34kowjHggiIuZIIiIAIi0eO76zDmFK+7OI5SKMthB+dI7Y0d5z6gVKEHOSjHiyMmorLOetMt4F40g3B7HF0NKRSx7c9jNjsujWLj2qpcZz61XDTg+jbrHrP8A696lUshc58sr8ySXOcT3lV9cag1ddNUHPJ7tnVw9y3tKmqUFBdwglJzk5Mx1N8O1nldtZrHOSPzH9m49yhC2NgrvIa8OefgpPNf0cx7F0PDpv+nTE4jmnwtVPyEpM9GT9LLz2dw1h1O51dy40t9ZUUNbBXUcpingeJI3t4EHMFdV4BxNS4rw5Bc4NVk2WpUwg+ikG8dXEdBCzG2bTRPpo8Hx8f7GdlW1R0PiiQIiJGXwiIgC3dHnqfQ/efmOWj0u+gt3tSeDVvNHnqfQ/efmOWj0u+gt3tSeDVqrjs1fLH0FNPrPmzI0TfI9X9o/aF66V/V2n+1t/A9eWib5Hq/tH7QvXSv6u0/2tv4HqK7M8vU9fWvMrFERZcahERABERABERABERABUH/ULigXC8RYdpJM6ehOvUEHY6Yjd/aDl1uI4K0tJ+LIsJYbkqmlrq6fOOkjPF/FxHM3eewcVyzVTvlklqamUue8mSSR52knaSSn2xbTVLp5cFwF97WwtCNNims8mt5hacpJ/NHQ3j/Haocs281prq5823UHmxjmasJaUWhERAEqwrchNEKKZ3wjB8GT85vN2KxtG+LqrCF+bVs1pKObJlXAD8dvOPrDeO0cVSMUj4pGyRuLXtOYI4FTWx3OO4QZHJs7B57f1HQoVKcakXCSymexk4vUjtq119HdLfBcKCdk9NO3XjkbuI/Q8MuCyVzJotx9V4RrvJ6jXqLRM7OaEbTGfps6ecce4rpG13Cjulvhr7fUMqKaZutHIw7CP0PQdoWNvrGdrPnF8GOaFdVV8TKREVEsFu6PPU+h+8/MctHpd9Bbvak8GreaPPU+h+8/MctHpd9Bbvak8GrVXHZq+WPoKafWfNmRom+R6v7R+0L10r+rtP8Aa2/gevLRN8j1f2j9oXrpX9Xaf7W38D1FdmeXqevrXmViiIsuNQiIgAiIgAiIgAsDEF3oLFaZ7pcphFTwtzPO48GtHEngEv13t9jtc1yudQ2CniG0ne48GgcSeZc1aSsb1uMLnmQ6C2wOPk1Pn/zdzuPu3DiSwsLCV1PlFcWVri4VJfE1+OsTVuK7/Lc6vNkfxKeHPMRR8B18SeJVfYruQANBC7afSkfhWdf7q2hh5KIg1DxsH0RzlQ1zi5xc4kuJzJPFbGEIwioxWEhM25PLPxERSAIiIAL1pZ5aads0Ly17TsK8kQBN7NdYbhFkcmTgeczn6R0KcYCxrd8IVuvRv5ajkdnPSSHzH9I+i7pHbmqSie+KRskbix7TmCDtClFnv8coENcRHJuEm5p6+ZQqU41IuM1lM9jJxeYnZ+C8YWXFdHyttqAJ2jOWmk2SR9nEdI2KQrjOhq6miqY6uiqZaeeM6zJYnlrm9RCtzBWmieEMpMU0xqGjICrp2gP/ALmbj1jLqKzd3sacPao71y7/AOxlRvYy3T3HQlDiG80NKylpK58ULM9Vga3ZmczvHOV43S73G5tjbX1TpxGSWZgDLPfuHQo9YL/Zr9TcvaLjBVtyzcGO85vtNO0doWzSmdSsl0cm/Df/AAW4xg/aSRsLZerpbInRUNW+Bj3azgADme0L9ud7utygbBXVj5o2u1w0gDI5EZ7B0la5FHpqmnTqeOWT3RHOcbwiIuZMIiIAIi0+I8TWLD0Jku9ygpzlm2PPOR3U0bT3KUISm8RWWeNpLLNwovjrHFlwlTE1kvL1rm5xUkRGu7mJ+i3pPZmquxrplr61slJhunNBCcwamXIzOHQNzfeepVTV1Es80lVVzvlkeS+SWR+ZceJJKd2mxpSeqvuXLvKFa9S3QN5jXFt3xZcfKrlLlEzMQ07NkcQ6BxPOTtPcFDL5d46FhijIfUEbG8G9JWDecQBodBQHM7jLwHV/KjT3Oe4uc4ucTmSTtK0kIRpxUYrCQtbcnln1NI+aV0sri97jmSeK+ERSAIiIAIiIAIiIAIiIA2Fsu9XQ5Na7lIv+27d2cyk1vvdFV5NL+RkPzX7O47lCUQBZtLUT0s7KilnlglYc2yRvLXDqIU4sOlnGFsa2OaqhuUQ2BtVHm7/c3Ik9ZKoWjuVbSZCGdwaPmnaO4rb02J3jIVNMD9aM5e4/yuVWhTqrE4pkozlD3WdNWrTlbn6rbpY6qDndTytkHc7V8SpHRaWsEVAHKXGelJ4TUz/2ghcpw3+2yfGkfEeZ7D+may47jQSfFrIOovAKXz2NbS4Jrwf1yWI3tVcd51izSNgl7Q4YhpQDzteD3EJJpGwSxuscQ0xH1WvJ9wXKYqKcjMTxEe2ENTTgZmeIDpeFy/wdD8z/AG+hL8fPkjpqu0uYJph8FXVFWeaGmePxBqjV205UbWubabFPIT8V9VKGZdbW5594VCyXKgj+NWQdjwfBYc+ILbH8R8kp+oz+cl1hse2jxTfi/pgjK9qvhuLOv+lTGN2DmMr226I/Mo26h/3HN3cVCp5pJZHzTyuke45ue92ZPSSVFarE8pzFNTNZ9Z5z9wWorLhWVfp53ub9EbG9wTClRp0liEUitKcp+8yU3C+0VLm2N3LyDgw7O0qNXK6VdecpX6sfCNuwf+Vgoup4EREAEREAEREAf//Z'
var VER = 'v5.1.11'



var TYPES = {
  foto:        { i:'',  l:'Foto',        c:'#6b6b6e', bg:'#6b6b6e14', br:'#6b6b6e30' },
  'foto-reel': { i:'',  l:'Foto+Reel',   c:'#6d28d9', bg:'#6d28d912', br:'#6d28d930' },
  'foto-dron': { i:'',  l:'Foto+Drohne', c:'#a16207', bg:'#a1620712', br:'#a1620730' },
  dron:        { i:'',  l:'Drohne',      c:'#15803d', bg:'#15803d12', br:'#15803d30' },
  reel:        { i:'',  l:'Reel',        c:'#6d28d9', bg:'#6d28d912', br:'#6d28d930' },
  '360':       { i:'',  l:'360°',        c:'#0891b2', bg:'#0891b212', br:'#0891b230' },
  todo:        { i:'',  l:'To Do',       c:'#6d28d9', bg:'#6d28d912', br:'#6d28d930' },
}

function hexToGradient(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'linear-gradient(135deg,#c49a75,#A67B5B)'
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
  const light=`rgb(${Math.min(255,r+45)},${Math.min(255,g+45)},${Math.min(255,b+45)})`
  const dark=`rgb(${Math.max(0,r-25)},${Math.max(0,g-25)},${Math.max(0,b-25)})`
  return `linear-gradient(135deg,${light},${dark})`
}

function getTypes(photoCats) {
  const result = {}
  const src = (photoCats && photoCats.length) ? photoCats : [
    { l:'Foto', c:'#6b6b6e' }, { l:'Foto+Reel', c:'#6d28d9' },
    { l:'Foto+Drohne', c:'#a16207' }, { l:'Drohne', c:'#15803d' },
    { l:'Reel', c:'#6d28d9' }, { l:'360°', c:'#0891b2' }, { l:'Video', c:'#1d5ec7' },
  ]
  for (const cat of src) {
    const obj = typeof cat === 'string' ? { l:cat, c:'#6b6b6e' } : cat
    const key = obj.l.toLowerCase().replace(/[^a-z0-9]/g,'')
    if (key && !result[key]) {
      const c = obj.c || '#6b6b6e'
      result[key] = { i:'', l:obj.l, c, bg:c+'22', br:c+'55' }
    }
  }
  result['todo'] = { i:'', l:'To Do', c:'#6d28d9', bg:'#6d28d922', br:'#6d28d955' }
  // Kanonikus kombó-kulcsok biztosítása (GCal/booking importból jöhetnek),
  // hogy a kártya mindig kapjon színt/labelt és ne essen néma fallbackre.
  const COMBO = {
    foto:['Foto','#6b6b6e'], reel:['Reel','#6d28d9'], drohne:['Drohne','#15803d'], '360':['360°','#0891b2'],
    fotoreel:['Foto+Reel','#6d28d9'], fotodrohne:['Foto+Drohne','#a16207'], foto360:['Foto+360°','#0891b2'],
    fotoreeldrohne:['Foto+Reel+Drohne','#7c3aed'], fotoreel360:['Foto+Reel+360°','#7c3aed'],
    fotodrohne360:['Foto+Drohne+360°','#a16207'], fotoreeldrohne360:['Foto+Reel+Drohne+360°','#7c3aed'],
  }
  for (const [k, [l, c]] of Object.entries(COMBO)) if (!result[k]) result[k] = { i:'', l, c, bg:c+'22', br:c+'55' }
  return result
}

function findType(types, cardType) {
  if (!cardType || !types) return null
  if (types[cardType]) return types[cardType]
  const norm = cardType.toLowerCase().replace(/[^a-z0-9]/g,'')
  if (types[norm]) return types[norm]
  for (const [k,v] of Object.entries(types)) {
    if (v.l && v.l.toLowerCase().replace(/[^a-z0-9]/g,'') === norm) return v
  }
  return null
}

const MONTHS_DE_PICKER = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function DateTimePicker({ date, time, timeTo, onDateChange, onTimeChange, onTimeToChange }) {
  const [calOpen, setCalOpen] = React.useState(false)
  const [timeOpen, setTimeOpen] = React.useState(false)
  const [cy, setCy] = React.useState(() => date ? parseInt(date.slice(0,4)) : new Date().getFullYear())
  const [cm, setCm] = React.useState(() => date ? parseInt(date.slice(5,7))-1 : new Date().getMonth())

  const fromT = time?.slice(0,5) || '10:00'
  const toT = timeTo?.slice(0,5) || (() => { const d=new Date('2000-01-01T'+(time?.slice(0,5)||'10:00')+':00'); d.setHours(d.getHours()+2); return d.toTimeString().slice(0,5) })()

  function pad(n){return String(n).padStart(2,'0')}
  function toMin(t){const[h,m]=(t||'00:00').split(':').map(Number);return h*60+m}
  function fromMin(m){return pad(Math.floor(m/60))+':'+pad(m%60)}
  function fmtDateDisp(s){if(!s)return'Datum wählen...';const d=new Date(s+'T00:00:00');const days=['So','Mo','Di','Mi','Do','Fr','Sa'];return days[d.getDay()]+'. '+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2)}

  const calDays = React.useMemo(() => {
    const first=new Date(cy,cm,1),last=new Date(cy,cm+1,0)
    const startDow=(first.getDay()+6)%7
    const days=[]
    for(let i=0;i<startDow;i++){const d=new Date(cy,cm,1-startDow+i);days.push({date:d,cur:false})}
    for(let d=1;d<=last.getDate();d++)days.push({date:new Date(cy,cm,d),cur:true})
    return days
  },[cy,cm])

  const timeSlots=[]
  for(let h=7;h<=20;h++)for(let m=0;m<60;m+=15)timeSlots.push(pad(h)+':'+pad(m))

  const diff=toMin(toT)-toMin(fromT)
  const dh=Math.floor(diff/60),dm=diff%60
  const durLabel=dh+'h'+(dm?' '+dm+'min':'')

  function pickFrom(t){
    onTimeChange(t)
    const fm=toMin(t)
    if(toMin(toT)<=fm) onTimeToChange(fromMin(Math.min(fm+120,toMin('20:00'))))
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:6 }}>
        <div onClick={()=>{setCalOpen(p=>!p);setTimeOpen(false)}}
          style={{ flex:'1.2', background:calOpen?'#6b6b6e14':'#f4f2ef', border:'1.5px solid '+(calOpen||date?'#6b6b6e':'#ddd9d2'), borderRadius:8, padding:'7px 10px', fontSize:13, fontWeight:700, color:date?'#6b6b6e':'#4a4540', cursor:'pointer', display:'flex', alignItems:'center', gap:5, userSelect:'none' }}>
          <i className="ti ti-calendar" style={{ fontSize:13 }} />
          <span>{fmtDateDisp(date)}</span>
          <i className="ti ti-chevron-down" style={{ fontSize:10, marginLeft:'auto', transition:'.2s', transform:calOpen?'rotate(180deg)':'' }} />
        </div>
        <div onClick={()=>{setTimeOpen(p=>!p);setCalOpen(false)}}
          style={{ flex:1, background:timeOpen?'#6b6b6e14':'#f4f2ef', border:'1.5px solid '+(timeOpen||time?'#6b6b6e':'#ddd9d2'), borderRadius:8, padding:'7px 10px', fontSize:12, fontWeight:700, color:time?'#6b6b6e':'#4a4540', cursor:'pointer', display:'flex', alignItems:'center', gap:4, userSelect:'none' }}>
          <i className="ti ti-clock" style={{ fontSize:13 }} />
          <span>{fromT} – {toT}</span>
          <i className="ti ti-chevron-down" style={{ fontSize:10, marginLeft:'auto', transition:'.2s', transform:timeOpen?'rotate(180deg)':'' }} />
        </div>
      </div>

      {calOpen && (
        <div style={{ background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:12, padding:12, marginBottom:8, boxShadow:'0 4px 20px rgba(0,0,0,.08)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <button type="button" onClick={()=>setCm(m=>m===0?(setCy(y=>y-1),11):m-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1c1a16', fontSize:18, padding:'0 8px', lineHeight:1 }}>‹</button>
            <span style={{ fontSize:13, fontWeight:700, color:'#1c1a16' }}>{MONTHS_DE_PICKER[cm]} {cy}</span>
            <button type="button" onClick={()=>setCm(m=>m===11?(setCy(y=>y+1),0):m+1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1c1a16', fontSize:18, padding:'0 8px', lineHeight:1 }}>›</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', gap:2, marginBottom:6 }}>
            {['M','D','M','D','F','S'].map((d,i)=><div key={i} style={{ fontSize:9, fontWeight:700, color:'#4a4540' }}>{d}</div>)}
            <div style={{ fontSize:9, fontWeight:700, color:'#b91c1c' }}>S</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {calDays.map((day,i)=>{
              const ds=day.date.toISOString().slice(0,10)
              const isSel=ds===date, isSun=day.date.getDay()===0
              const today=new Date().toISOString().slice(0,10)
              return <div key={i} onClick={()=>{onDateChange(ds);setCy(day.date.getFullYear());setCm(day.date.getMonth())}}
                style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', fontSize:11, cursor:'pointer', margin:'0 auto', fontWeight:isSel?700:400, background:isSel?'#6b6b6e':'none', color:isSel?'#fff':!day.cur?'#aaa8a0':isSun?'#b91c1c':'#1c1a16', border:ds===today&&!isSel?'1.5px solid #6b6b6e':'none' }}>{day.date.getDate()}</div>
            })}
          </div>
          {date && <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8, paddingTop:8, borderTop:'0.5px solid #eeeae6' }}>
            <button type="button" onClick={()=>{onDateChange(null);setCalOpen(false)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#b91c1c', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-trash" style={{ fontSize:10 }} /> Datum löschen
            </button>
          </div>}
        </div>
      )}

      {timeOpen && (
        <div style={{ background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:12, padding:12, marginBottom:8, boxShadow:'0 4px 20px rgba(0,0,0,.08)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'#4a4540', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7, display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-player-play" style={{ fontSize:10, color:'#6b6b6e' }} /> Von
              </div>
              <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, scrollbarWidth:'none' }}>
                {timeSlots.map(t=>(
                  <div key={t} onClick={()=>pickFrom(t)}
                    style={{ padding:'7px 6px', textAlign:'center', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:t===fromT?700:500, background:t===fromT?'#6b6b6e':'#f4f2ef', color:t===fromT?'#fff':'#1c1a16', border:'0.5px solid '+(t===fromT?'#6b6b6e':'#ddd9d2') }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'#4a4540', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7, display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-player-stop" style={{ fontSize:10, color:'#6b6b6e' }} /> Bis
              </div>
              <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, scrollbarWidth:'none' }}>
                {timeSlots.filter(t=>toMin(t)>toMin(fromT)).map(t=>{
                  const inRange=toMin(t)>toMin(fromT)&&toMin(t)<=toMin(toT)
                  return <div key={t} onClick={()=>onTimeToChange(t)}
                    style={{ padding:'7px 6px', textAlign:'center', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:t===toT?700:500, background:t===toT?'#6b6b6e':inRange?'#6b6b6e18':'#f4f2ef', color:t===toT?'#fff':inRange?'#7a4a00':'#1c1a16', border:'0.5px solid '+(t===toT?'#6b6b6e':inRange?'#6b6b6e66':'#ddd9d2') }}>
                    {t}
                  </div>
                })}
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, paddingTop:8, borderTop:'0.5px solid #eeeae6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#4a4540', fontWeight:600 }}>⏱ {durLabel} Aufnahmedauer</span>
            <button type="button" onClick={()=>setTimeOpen(false)} style={{ background:'#6b6b6e', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}

var AUTO_CL = ['Fotografiert', 'Für Bearbeitung gesendet', 'In Bearbeitung', 'Reel in Bearbeitung']
function getAutoChecklist(cardType) {
  const base = ['Fotografiert', 'Für Bearbeitung gesendet', 'In Bearbeitung', 'Reel in Bearbeitung']
  if (cardType && (cardType.includes('reel') || cardType === 'reel')) {
    return [...base, 'Reel Fertig']
  }
  return base
}

var COLORS = [
  '#FFBE98','#A67B5B','#7BBFCB','#E8A87C','#9CAF88','#C9A96E',
  '#B5C4B1','#D4A5A5','#A8C5DA','#6B7C93','#E8D5B7','#C4956A',
  '#8FA68E','#D4869B','#7B9EA6','#5C6BC0','#7E57C2','#EC407A',
  '#EF5350','#FF7043','#FFA726','#26A69A','#42A5F5','#66BB6A',
]

var CALS = process.env.NEXT_PUBLIC_DEMO_CAL_ID ? [
  { id: process.env.NEXT_PUBLIC_DEMO_CAL_ID.replace('@', '%40'), label: 'Demo IP', color: '#F6BF26' },
] : [
  { id: 'immopixels%40gmail.com', label: 'ImmoPixels', color: '#F6BF26' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966%40group.calendar.google.com', label: 'D - Terminen', color: '#616161' },
  { id: '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b%40group.calendar.google.com', label: 'E - Terminen', color: '#0B8043' },
  { id: '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61%40group.calendar.google.com', label: 'N - Terminen', color: '#8E24AA' },
  { id: 'en.german%23holiday%40group.v.calendar.google.com', label: 'Holidays', color: '#9c9589' },
]


function renderText(text, staffList = []) {
  if (!text) return null
  const URL_RE = /https?:\/\/[^\s]+/g
  const parts = []
  let last = 0
  const matches = [...String(text).matchAll(URL_RE)]
  for (const m of matches) {
    if (m.index > last) parts.push({ type: 'text', val: text.slice(last, m.index) })
    const url = m[0]
    const short = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 32) + (url.length > 36 ? '…' : '')
    parts.push({ type: 'url', val: url, short })
    last = m.index + url.length
  }
  if (last < text.length) parts.push({ type: 'text', val: text.slice(last) })
  if (parts.length === 0) parts.push({ type: 'text', val: text })
  return parts.map((pt, i) => {
    if (pt.type === 'url') return <a key={i} href={pt.val} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{ color:'var(--gold)', textDecoration:'underline', wordBreak:'break-all' }}>{pt.short}</a>
    // parse @mentions in text parts
    const sub = pt.val.split(/(@[A-Za-zÀ-ž0-9_.-]+)/g)
    return sub.map((s, j) => s.startsWith('@') ? <span key={i+'-'+j} style={{ color:'var(--gold)', fontWeight:700 }}>{s}</span> : s)
  })
}

var DAYS = { Mon:'H', Tue:'K', Wed:'Sze', Thu:'Cs', Fri:'P', Sat:'Szo', Sun:'V' }
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  const day = dt.toLocaleDateString('en-US', { weekday: 'short' })
  return (DAYS[day] || '') + ' ' + d.slice(5)
}
function fmtTime(t) { return t ? t.slice(0, 5) : '' }

var LS = { fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4, display:'block' }
var IS = { background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:7, padding:'7px 10px', fontSize:13, color:'var(--t1)', fontFamily:'Arial', outline:'none', width:'100%' }
var BTNP = { background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:700, cursor:'pointer' }
var BTNG = { background:'none', border:'1.5px solid var(--brd2)', color:'var(--t2)', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:700, cursor:'pointer' }
var BTNR = { background:'none', border:'1.5px solid var(--rdbr)', color:'var(--red)', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:700, cursor:'pointer' }


// ── NOTIFICATION COMPONENTS ──
function MentionDropdown({ query, staff, onSelect, style }) {
  if (!query && query !== '') return null
  const filtered = (staff||[]).filter(s => s.name && s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
  const showAll = 'all'.includes(query.toLowerCase())
  if (!filtered.length && !showAll) return null
  return (
    <div style={{ position:'absolute', zIndex:9999, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)', minWidth:160, overflow:'hidden', ...style }}>
      {showAll && (
        <div onMouseDown={e=>{ e.preventDefault(); onSelect({ id:'__all__', name:'all', init:'ALL', color:'#6b6b6e', avatar_url:null }) }}
          style={{ padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, color:'var(--gold)' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--gdbg)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>ALL</span>
          @all — Alle benachrichtigen
        </div>
      )}
      {filtered.map(s => (
        <div key={s.id} onMouseDown={e=>{ e.preventDefault(); onSelect(s) }}
          style={{ padding:'7px 12px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'background .12s' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:s.color+'22', color:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:'2px solid var(--bg2)', overflow:'hidden', flexShrink:0 }}>
            {s.avatar_url ? <img src={s.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : s.init}
          </div>
          {s.name}
        </div>
      ))}
    </div>
  )
}

const SERVICE_CATALOG = [
  { id: 'foto', label: 'Fotoshooting', grundpreis: '199.00' },
  { id: 'fotodron', label: 'Foto + Drohne', grundpreis: '349.00' },
  { id: 'dron', label: 'Drohne', grundpreis: '179.00' },
  { id: 'reel', label: 'Reel', grundpreis: '249.00' },
  { id: 'reelmakler', label: 'Reel mit Makler', grundpreis: '' },
  { id: 'fotoreel', label: 'Foto + Reel', grundpreis: '' },
  { id: 'fotoreelmakler', label: 'Foto + Reel mit Makler', grundpreis: '' },
  { id: 'aussen', label: 'Aussenaufnahmen', grundpreis: '' },
  { id: 'kibild', label: 'KI Bildbearbeitung', grundpreis: '29.99' },
]

function MaklerTermineModal({ cols, clients, onClose, onDone }) {
  const [cals, setCals] = React.useState(null)
  const [calId, setCalId] = React.useState('*')
  const [clientVal, setClientVal] = React.useState('')
  const [year, setYear] = React.useState(new Date().getFullYear())
  const [colId, setColId] = React.useState(cols[0]?.id || '')
  const [preview, setPreview] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [err, setErr] = React.useState('')
  const [warn, setWarn] = React.useState('')
  const [manualId, setManualId] = React.useState('')
  const [filter, setFilter] = React.useState('')
  const [sel, setSel] = React.useState(() => new Set())
  React.useEffect(() => { (async () => {
    try { const r = await fetch('/api/maklertermine'); const j = await r.json(); if (!j.ok) throw new Error(j.error); setCals(j.calendars || []); if (j.fallback) setWarn('Volle Kalenderliste nicht verfügbar (alte Google-Verbindung). Im Kalender-Tab „Mit Google verbinden" neu ausführen — oder unten die Kalender-ID manuell eintragen.') }
    catch (e) { setErr('Kalender konnten nicht geladen werden: ' + (e.message || e)); setCals([]) }
  })() }, [])
  const evMatch = (e, q) => !q || [e.summary, e.location, e.description].some(v => (v || '').toLowerCase().includes(q.toLowerCase()))
  const filteredEvents = (preview?.events || []).filter(e => evMatch(e, filter.trim()))
  async function call(create) {
    setBusy(true); setErr(''); if (create) setResult(null)
    try {
      const selectedEvents = create ? (preview?.events || []).filter(e => sel.has(e.gid)) : undefined
      const r = await fetch('/api/maklertermine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calendarId: (manualId.trim() || calId), year, clientName: create ? clientVal : undefined, columnId: create ? colId : undefined, create, events: selectedEvents }) })
      const j = await r.json(); if (!j.ok) throw new Error(j.error)
      if (create) { setResult(j); onDone && onDone() } else {
        setPreview(j)
        // alapértelmezett kijelölés: a Kunde nevére/Kürzeljére illeszkedő terminek
        const q = (clientVal || '').trim()
        setFilter(q)
        setSel(new Set((j.events || []).filter(e => evMatch(e, q)).map(e => e.gid)))
      }
    } catch (e) { setErr(e.message || String(e)) }
    setBusy(false)
  }
  const curY = new Date().getFullYear(); const years = [curY + 1, curY, curY - 1, curY - 2]
  const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', color: 'var(--t1)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5, display: 'block' }
  const gbtn = { background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
  const ghost = { background: 'var(--bg2)', color: 'var(--t1)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 16px', zIndex: 200, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>🗓️ Makler-Termine importieren</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t3)' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>Termine aus den Google-Kalendern als echte CRM-Karten zum gewählten Kunden anlegen. Standard: <b>Alle Kalender</b> des immopixels-Kontos — so wird kein Fototermin übersehen.</div>
        {err && <div style={{ background: '#fae7e2', border: '1px solid #e9b8ad', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#b3402f', marginBottom: 12 }}>{err}</div>}
        {warn && <div style={{ background: '#fdf3df', border: '1px solid #ecd9a8', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#8a6a1f', marginBottom: 12 }}>⚠ {warn}</div>}
        {cals === null ? <div style={{ color: 'var(--t3)', fontSize: 13, padding: '10px 0' }}>Kalender werden geladen…</div> : (
          <>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Google-Kalender</label>
              <select value={calId} onChange={e => { setCalId(e.target.value); setPreview(null) }} style={inp}><option value="*">⭐ Alle Kalender (immopixels@gmail.com)</option>{(cals || []).map(c => <option key={c.id} value={c.id}>{c.summary}{c.primary ? ' (Hauptkalender)' : ''}</option>)}</select>
              <input value={manualId} onChange={e => { setManualId(e.target.value); setPreview(null) }} placeholder="…oder Kalender-ID manuell (z.B. makler@gmail.com)" style={{ ...inp, marginTop: 6, fontSize: 12 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Jahr</label><select value={year} onChange={e => { setYear(+e.target.value); setPreview(null) }} style={inp}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label style={lbl}>In Spalte</label><select value={colId} onChange={e => setColId(e.target.value)} style={inp}>{cols.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Kunde (Makler) — Karten gehören diesem Kunden</label>
              <input list="mt-clients" value={clientVal} onChange={e => setClientVal(e.target.value)} placeholder="Kunde wählen…" style={inp} />
              <datalist id="mt-clients">{clients.map(c => <option key={c.id} value={c.short_name || c.name}>{c.name}</option>)}</datalist>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={() => call(false)} disabled={busy || (!calId && !manualId.trim())} style={ghost}>{busy && !result ? '…' : 'Vorschau laden'}</button>
              <div style={{ flex: 1 }} />
              <button onClick={onClose} style={ghost}>Abbrechen</button>
              <button onClick={() => { if (!clientVal || !colId) { setErr('Kunde und Spalte wählen.'); return } if (!sel.size) { setErr('Keine Termine ausgewählt.'); return } if (confirm(sel.size + ' Termin(e) als Karten importieren?')) call(true) }} disabled={busy || !preview || !sel.size} style={gbtn}>{busy ? 'Importiere…' : 'Importieren' + (sel.size ? ' (' + sel.size + ')' : '')}</button>
            </div>
            {preview && !result && <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: 12, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{preview.count} Termin(e) in {year} — {sel.size} ausgewählt</span>
                <div style={{ flex: 1 }} />
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter (z.B. Fetter)" style={{ ...inp, width: 150, padding: '5px 9px', fontSize: 12 }} />
                <button onClick={() => setSel(new Set(filteredEvents.map(e => e.gid)))} style={{ ...ghost, padding: '5px 9px', fontSize: 11.5 }}>Gefilterte wählen</button>
                <button onClick={() => setSel(new Set())} style={{ ...ghost, padding: '5px 9px', fontSize: 11.5 }}>Keine</button>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', fontSize: 12 }}>{filteredEvents.map((e, i) => { const on = sel.has(e.gid); return (
                <label key={e.gid || i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '0.5px solid var(--border)', alignItems: 'flex-start', cursor: 'pointer', opacity: on ? 1 : 0.55 }}>
                  <input type="checkbox" checked={on} onChange={() => setSel(s => { const n = new Set(s); n.has(e.gid) ? n.delete(e.gid) : n.add(e.gid); return n })} style={{ width: 14, height: 14, accentColor: 'var(--gold)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.date.split('-').reverse().join('.')}{e.time ? ' ' + e.time : ''}</span>
                  <span style={{ flex: 1 }}>{e.summary}{e.location ? <span style={{ color: 'var(--t3)' }}> · {e.location}</span> : ''}</span>
                </label>) })}
                {filteredEvents.length === 0 && <div style={{ color: 'var(--t3)', padding: '10px 0' }}>Keine Treffer für „{filter}".</div>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 8 }}>Nur die ausgewählten Termine werden importiert. Bereits vorhandene Karten (gleicher Kunde + Datum + Titel) werden übersprungen.</div>
            </div>}
            {result && <div style={{ background: '#e6f3ec', border: '1px solid #b6dcc4', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#2f7a4f', marginTop: 8 }}>✓ {result.created} Karten erstellt, {result.skipped} übersprungen (von {result.total}). Schließe das Fenster.</div>}
          </>
        )}
      </div>
    </div>
  )
}

function ClientPriceEditor({ servicePrices, clientPrices, onChange }) {
  const [prices, setPrices] = useState(clientPrices || {})
  useEffect(() => { setPrices(clientPrices || {}) }, [JSON.stringify(clientPrices)])
  function update(id, val) {
    const next = { ...prices, [id]: val }
    setPrices(next)
    onChange(next)
  }
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:'4px 8px', marginBottom:6 }}>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', padding:'0 4px' }}>Leistung</div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', textAlign:'right' }}>Preis (€)</div>
      </div>
      {servicePrices.map(svc => (
        <div key={svc.id} style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:'4px 8px', marginBottom:5, alignItems:'center' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', padding:'6px 10px', background:'var(--bg3)', borderRadius:6 }}>{svc.label}</div>
          <input
            type="number" step="0.01" min="0"
            value={prices[svc.id] || ''}
            placeholder={svc.grundpreis}
            onChange={e => update(svc.id, e.target.value)}
            style={{ background:'var(--bg2)', border:'1.5px solid var(--border)', borderRadius:6, padding:'6px 8px', fontSize:12, fontWeight:600, color:'var(--t1)', textAlign:'right', outline:'none', width:'100%', boxSizing:'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor='var(--gold)'}
            onBlur={e => e.currentTarget.style.borderColor='var(--border)'}
          />
        </div>
      ))}
      <div style={{ fontSize:9, color:'var(--t3)', fontStyle:'italic', marginTop:4 }}>Leeres Feld = Grundpreis wird verwendet</div>
    </div>
  )
}

function NotificationBell({ onClick, count }) {
  return (
    <div onClick={onClick} style={{ position:'relative', width:32, height:32, borderRadius:8, background:'var(--bg3)', border:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--t2)', transition:'all .15s' }}
      onMouseEnter={e=>{e.currentTarget.style.background='var(--bg2)';e.currentTarget.style.color='var(--gold)';e.currentTarget.style.borderColor='var(--gold)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='var(--border)'}}>
      <i className="ti ti-bell" style={{ fontSize:15 }} />
      {count > 0 && (
        <div style={{ position:'absolute', top:-5, right:-5, minWidth:17, height:17, borderRadius:'50%', background:'#b91c1c', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg2)', padding:'0 3px' }}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  )
}

function NotificationDropdown({ notifications, onRead, onReadAll, staff }) {
  function getSender(id) { return staff?.find(s => s.id === id) }
  return (
    <div className="modal-animate" style={{ position:'absolute', top:40, right:0, width:320, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.14)', zIndex:500, overflow:'hidden' }}>
      <div style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
        <i className="ti ti-bell" style={{ fontSize:14, color:'var(--gold)' }} />
        <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)', flex:1 }}>Benachrichtigungen</span>
        {notifications.filter(n=>!n.read).length > 0 && <span style={{ background:'#b91c1c', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{notifications.filter(n=>!n.read).length}</span>}
        <span onClick={onReadAll} style={{ fontSize:11, color:'var(--t3)', cursor:'pointer', marginLeft:6 }} onMouseEnter={e=>e.currentTarget.style.color='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>Alle lesen</span>
      </div>
      <div style={{ maxHeight:340, overflowY:'auto' }}>
        {notifications.length === 0 && <div style={{ padding:24, textAlign:'center', color:'var(--t3)', fontSize:12 }}>Keine Benachrichtigungen</div>}
        {notifications.map(n => {
          const s = getSender(n.sender_id)
          return (
            <div key={n.id} onClick={() => onRead(n)} style={{ padding:'10px 14px', display:'flex', gap:9, alignItems:'flex-start', borderBottom:'0.5px solid var(--border)', cursor:'pointer', background: n.read?'none':'rgba(184,137,42,.04)', transition:'background .12s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background=n.read?'none':'rgba(184,137,42,.04)'}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:(s?.color||'#6b6b6e')+'22', color:s?.color||'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                {s?.avatar_url ? <img src={s.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (s?.init||'?')}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'var(--t1)', lineHeight:1.4 }}><strong>{s?.name||'?'}</strong> {n.type==='card_assigned'?'hat dich zugewiesen':'hat dich erwähnt'}</div>
                {n.message && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>„{n.message.slice(0,50)}{n.message.length>50?'...':''}"</div>}
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:3 }}>{new Date(n.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <div style={{ width:7, height:7, borderRadius:'50%', background: n.read?'transparent':'#b91c1c', flexShrink:0, marginTop:4 }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NotifToast({ n, staff, onClose, onOpen }) {
  const s = staff?.find(x => x.id === n.sender_id)
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t) }, [])
  return (
    <div onClick={() => onOpen?.(n)} style={{ width:290, background:'var(--bg2)', borderRadius:12, border:'0.5px solid var(--border)', padding:'11px 13px', boxShadow:'0 8px 32px rgba(0,0,0,.14)', display:'flex', gap:9, alignItems:'flex-start', animation:'slideInRight .3s cubic-bezier(.34,1.56,.64,1)', cursor:n.card_id?'pointer':'default' }}>
      <div style={{ width:34, height:34, borderRadius:9, background: n.type==='card_assigned'?'rgba(123,191,203,.15)':'rgba(212,134,155,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <i className={'ti ' + (n.type==='card_assigned'?'ti-user-plus':'ti-at')} style={{ fontSize:15, color: n.type==='card_assigned'?'#2a6a7a':'#7a2045' }} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:2 }}>ImmoPixels CRM</div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', marginBottom:2 }}>{n.type==='card_assigned'?'Du wurdest zugewiesen':'@mention'}</div>
        <div style={{ fontSize:11, color:'var(--t2)' }}>{s?.name}: {n.message?.slice(0,50)}</div>
      </div>
      <button onClick={e=>{e.stopPropagation();onClose()}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:13, padding:0 }}><i className="ti ti-x" style={{ fontSize:12 }} /></button>
    </div>
  )
}

async function sendNotification(supabase, { recipientId, senderId, type, cardId, message }) {
  if (!recipientId || recipientId === senderId) return
  try { await supabase.from('notifications').insert({ recipient_id: recipientId, sender_id: senderId, type, card_id: cardId, message, read: false }) } catch(e) {}
}

export default function Home() {
  const [tab, setTab] = useState(() => { try { const t = new URLSearchParams(window.location.search).get('tab'); return t || 'board' } catch { return 'board' } })
  const [boardSearch, setBoardSearch] = useState('')
  const [phonebookRaw, setPhonebook] = useState([])
  const [pbSearch, setPbSearch] = useState('')
  const [pbFilter, setPbFilter] = useState('all')
  const [pbSelected, setPbSelected] = useState(null)
  const [pbChecked, setPbChecked] = useState([])
  const [pbEditing, setPbEditing] = useState(false)
  const [pbShowImport, setPbShowImport] = useState(false)
  const [cols, setCols] = useState([])
  const [cards, setCards] = useState([])
  const [boards, setBoards] = useState([])
  const [activeBoardId, setActiveBoardId] = useState(null)
  const [myRow, setMyRow] = useState(null)
  const [staffRaw, setStaff] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [droppedCard, setDroppedCard] = useState(null)
  const dragFlyRef = React.useRef(null)
  const dragOffRef = React.useRef({ x: 0, y: 0 })
  const dragTiltRef = React.useRef(0)
  const dragLastXRef = React.useRef(0)
  const dragCardRef = React.useRef(null)
  const dragCardElRef = React.useRef(null)
  const isDraggingRef = React.useRef(false)
  const dragDidMoveRef = React.useRef(false)
  const [dragOverColId, setDragOverColId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const colDragRef = React.useRef(null)
  const colDragFlyRef = React.useRef(null)
  const colDragOffRef = React.useRef({ x: 0, y: 0 })
  const colDragTiltRef = React.useRef(0)
  const colDragLastXRef = React.useRef(0)
  const isColDraggingRef = React.useRef(false)
  const colDragPhRef = React.useRef(null)
  const colDragOverIndexRef = React.useRef(null)
  const [modal, setModal] = useState(null)
  const [maklerModal, setMaklerModal] = useState(false)
  const [newCardColId, setNewCardColId] = useState(null)
  const [gcalPickerOpen, setGcalPickerOpen] = useState(false)
  const [colCardLimit, setColCardLimit] = useState({})
  const [colSort, setColSort] = useState(() => { try { return JSON.parse(localStorage.getItem('ip-col-sort') || '{}') } catch { return {} } })
  const [colSortMenu, setColSortMenu] = useState(null)
  const setColSortFor = (colId, mode) => setColSort(p => { const n = { ...p, [colId]: mode }; try { localStorage.setItem('ip-col-sort', JSON.stringify(n)) } catch {}; return n })
  const PAGE_SIZE = 10
  const [editColModal, setEditColModal] = useState(null)
  const [gcalPickerEvents, setGcalPickerEvents] = useState([])
  const [gcalPickerLoading, setGcalPickerLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dirtyCards, setDirtyCards] = useState({})
  const [editingCards, setEditingCards] = useState({}) // más userek editing jelzői
  const [onlineUsers, setOnlineUsers] = useState({})
  const lastActivityRef = useRef(Date.now())
  const [chatMuted, setChatMuted] = useState(false)
  const chatAudioRef = useRef(null)
  const [noteMention, setNoteMention] = useState({ cardId:null, query:'', pos:0 })
  const [descMention, setDescMention] = useState({ query:'', pos:0, show:false })
  const [view, setView] = useState('board')
  const [editClient, setEditClient] = useState(null)
  const [clientSpJson, setClientSpJson] = useState('{}')
  const [clientColorState, setClientColorState] = useState('')
  const [servicePrices, setServicePrices] = useState(SERVICE_CATALOG)
  const [priceAccordion, setPriceAccordion] = useState(null)
  const [editStaff, setEditStaff] = useState(null)
  const [staffAvatarData, setStaffAvatarData] = useState(null)
  const [showCrop, setShowCrop] = useState(false)
  const [newColColor, setNewColColor] = useState('#1d5ec7')
  const [calFilters, setCalFilters] = useState(() => CALS.slice(0, 5).map(c => c.id))
  const [calView, setCalView] = useState('MONTH')
  const [collapsedCols, setCollapsedCols] = useState([])
  const [cardType, setCardType] = useState('foto')
  const [ncDate, setNcDate] = React.useState(new Date().toISOString().slice(0,10))
  const [ncTime, setNcTime] = React.useState('10:00')
  const [ncTimeTo, setNcTimeTo] = React.useState('12:00')
  const [clInput, setClInput] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  // Demo: Dirk Fellhauer rejtése — render-szinten származtatva, betöltési sorrendtől függetlenül
  const HIDDEN_FOR_DEMO = s => ((s.email || '').toLowerCase() === 'd.fellhauer@immopixels.de') || /dirk\s*fell?hauer/i.test(s.name || '')
  const _demoMe = currentUser ? staffRaw.find(s => s.email === currentUser.email) : null
  const _hideForDemo = _demoMe?.role_level === 'demo'
  const staff = _hideForDemo ? staffRaw.filter(s => !HIDDEN_FOR_DEMO(s)) : staffRaw
  const phonebook = _hideForDemo ? phonebookRaw.filter(p => !HIDDEN_FOR_DEMO(p)) : phonebookRaw
  const [showProfile, setShowProfile] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientView, setClientView] = useState('cards')
  const [clientDupModal, setClientDupModal] = useState(false)
  const [clientDupGroups, setClientDupGroups] = useState([])
  const [selClients, setSelClients] = useState(() => new Set())
  const [activeSession, setActiveSession] = useState(null)
  const [birthdayPerson, setBirthdayPerson] = useState(null) // staff member with birthday today // {id, check_in, break_minutes}
  const [sessionTick, setSessionTick] = useState(0) // for live timer
  const [teamSessions, setTeamSessions] = useState([]) // today's sessions for all staff
  const [showDebug, setShowDebug] = useState(false)
  const [debugLog, setDebugLog] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const [sendModal, setSendModal] = useState(null)
  const [maklers, setMaklers] = useState({})
  const [version, setVersion] = useState(VER)
  const [now, setNow] = useState(new Date())
  const [syncTxt, setSyncTxt] = useState('GCal')

  const noteTimerRef = useRef({})
  const [photoCats, setPhotoCats] = useState([
    { l:'Foto', c:'#6b6b6e', bg:'#6b6b6e14', br:'#6b6b6e30' },
    { l:'Foto+Reel', c:'#6d28d9', bg:'#6d28d912', br:'#6d28d930' },
    { l:'Foto+Drohne', c:'#a16207', bg:'#a1620712', br:'#a1620730' },
    { l:'Drohne', c:'#15803d', bg:'#15803d12', br:'#15803d30' },
    { l:'Reel', c:'#6d28d9', bg:'#6d28d912', br:'#6d28d930' },
    { l:'360°', c:'#0891b2', bg:'#0891b212', br:'#0891b230' },
    { l:'Video', c:'#1d5ec7', bg:'#1d5ec712', br:'#1d5ec730' },
  ])
  const [bgColor, setBgColor] = useState('linen')
  const [fontSize, setFontSize] = useState('md')
  const [cardSize, setCardSize] = useState('standard')
  const [colWidgetHeader, setColWidgetHeader] = useState(false)
  const [compactEnabled, setCompactEnabled] = useState(false)
  const [compactCards, setCompactCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem('compactCards') || '[]') } catch(e) { return [] }
  })
  const [clientCats, setClientCats] = useState(['Maklerunternehmen','Privat','Bauträger','Bank','Home Designer','Sonstige'])
  const [staffRoles, setStaffRoles] = useState(['Fotograf','Videograf / Cutter','Drohnen Pilot','Backoffice','Social Media','Leiter / Fotograf'])
  const [mentionList, setMentionList] = useState([])
  const [mentionIdx, setMentionIdx] = useState(0)
  const [replyTo, setReplyTo] = useState(null)
  const [unreadChat, setUnreadChat] = useState(0)
  const [widgets, setWidgets] = useState(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('ip-widgets') || 'null') || [
      { id:'weather', type:'weather', x:20, y:80, w:280, h:200, open:true },
      { id:'todo', type:'todo', x:320, y:80, w:260, h:300, open:true },
      { id:'nexttermin', type:'nexttermin', x:600, y:80, w:260, h:200, open:true },
      { id:'stats', type:'stats', x:20, y:300, w:540, h:160, open:true },
    ] } catch { return [] }
  })
  const [todoItems, setTodoItems] = useState(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('ip-todos') || '[]') } catch { return [] }
  })
  const [todoInput, setTodoInput] = useState('')
  const [dragTodoIdx, setDragTodoIdx] = useState(null)
  const [colorPickerWidget, setColorPickerWidget] = useState(null)
  // Makler-Monatsliste widget (csak jelölés, localStorage, semmihez nem kapcsolódik)
  const [maklerData, setMaklerData] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('ip-makler-widget') || '{}') } catch { return {} }
  })
  function saveMakler(next) { setMaklerData(next); try { localStorage.setItem('ip-makler-widget', JSON.stringify(next)) } catch {} }
  function maklerUpdMonth(m, patch) {
    const cur = maklerData[m] || { checked: [], hidden: [], extra: [], rename: {} }
    saveMakler({ ...maklerData, [m]: { ...cur, ...patch } })
  }
  // Billomat ügyfél-import popup
  const [bmList, setBmList] = useState([])
  const [bmSel, setBmSel] = useState(() => new Set())
  const [bmSearch, setBmSearch] = useState('')
  const [bmLoading, setBmLoading] = useState(false)
  const [bmBusy, setBmBusy] = useState(false)
  // Rechnung (Entwurf) ablak
  const [invClient, setInvClient] = useState(null)
  const [invItems, setInvItems] = useState([])
  const [invNote, setInvNote] = useState('')
  const [invHist, setInvHist] = useState([])
  const [invHistLoading, setInvHistLoading] = useState(false)
  const [invBusy, setInvBusy] = useState(false)
  const [invResult, setInvResult] = useState(null)
  const [invCardIds, setInvCardIds] = useState([])
  // Monatsabrechnung
  const [monthSel, setMonthSel] = useState('')
  const [monthGroups, setMonthGroups] = useState([])
  const [monthChecked, setMonthChecked] = useState(() => new Set())
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthMode, setMonthMode] = useState('month') // 'month' | 'client'
  const [monthClientId, setMonthClientId] = useState('')
  // Karten-Kunden reparieren (tömeges hozzárendelés előnézettel)
  const [fixList, setFixList] = useState([])
  const [fixSel, setFixSel] = useState(() => new Set())
  const [fixLoading, setFixLoading] = useState(false)
  const [fixBusy, setFixBusy] = useState(false)
  // Duplikate finden
  const [dupGroups, setDupGroups] = useState([])
  const [dupDel, setDupDel] = useState(() => new Set())
  const [dupLoading, setDupLoading] = useState(false)
  const [dupBusy, setDupBusy] = useState(false)
  const [showWidgets, setShowWidgets] = useState(()=>typeof window!=='undefined'?window.innerWidth>768:true)
  const [draggingWidget, setDraggingWidget] = useState(null)
  const [customWidgetModal, setCustomWidgetModal] = useState(false)
  const [unreadEmail, setUnreadEmail] = useState(0)
  const [ameliaPending, setAmeliaPending] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)
  useEffect(() => {
    // Demo: minden belépéskor felugrik a tutorial (élesben nem)
    if (process.env.NEXT_PUBLIC_IS_DEMO === '1') {
      const t = setTimeout(() => setShowTutorial(true), 600)
      return () => clearTimeout(t)
    }
  }, [])
  const [colModal, setColModal] = useState(null)
  const [undoToast, setUndoToast] = useState(null) // { message, onUndo, timer }
  const undoTimerRef = React.useRef(null)
  const [colPrivate, setColPrivate] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [toasts, setToasts] = useState([])
  const [minimizedWidgets, setMinimizedWidgets] = useState(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('ip-minimized-widgets') || '[]') } catch { return [] }
  })
  function toggleMinimized(id) {
    setMinimizedWidgets(p => {
      const next = p.includes(id) ? p.filter(x=>x!==id) : [...p, id]
      localStorage.setItem('ip-minimized-widgets', JSON.stringify(next))
      return next
    })
  }
  const [customWidgetForm, setCustomWidgetForm] = useState({ title:'', type:'iframe', url:'', html:'' })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState([{ role:'assistant', content:'Hallo! Ich bin der ImmoPixels AI-Assistent. Du kannst mich nach Karten, Kunden, Statistiken fragen oder Hilfe bei E-Mail-Vorlagen anfragen. Wie kann ich helfen?' }])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiEndRef = useRef(null)
  const [newVersionAvail, setNewVersionAvail] = useState(false)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherCity, setWeatherCity] = useState(() => {
    if (typeof window === 'undefined') return 'Hettenleidelheim'
    return localStorage.getItem('ip-weather-city') || 'Hettenleidelheim'
  })
  const [weatherCityInput, setWeatherCityInput] = useState('')

  // Close profile on outside click
  useEffect(() => {
    function handleClick() { setShowProfile(false) }
    if (showProfile) document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showProfile])

  // Clock
  useEffect(() => {
    const ti = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(ti)
  }, [])

  // Version badge with Berlin time
  useEffect(() => {
    function upd() {
      const s = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' })
      setVersion(VER + ' · ' + s.slice(0, 10) + ' ' + s.slice(11, 16))
    }
    upd()
    const ti = setInterval(upd, 60000)
    return () => clearInterval(ti)
  }, [])

  // Broadcast version update to all users via chat
  useEffect(() => {
    if (!staff.length) return
    const key = 'ip-last-ver'
    const lastVer = localStorage.getItem(key)
    if (lastVer && lastVer !== VER) {
      // New version detected - show banner
      setNewVersionAvail(true)
    }
    localStorage.setItem(key, VER)
  }, [staff])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = '/login'
      else setCurrentUser(session.user)
    })
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') window.location.href = '/login'
      if (session) setCurrentUser(session.user)
    })
  }, [])

  function saveWidgets(w) {
    setWidgets(w)
    localStorage.setItem('ip-widgets', JSON.stringify(w))
  }
  function saveTodos(t) {
    setTodoItems(t)
    localStorage.setItem('ip-todos', JSON.stringify(t))
  }
  // v4.2.0: elem áthelyezése drag-gel (from→to a kanonikus todoItems tömbben)
  function moveTodo(from, to) {
    if (from == null || to == null || from === to) return
    const t = [...todoItems]
    const [m] = t.splice(from, 1)
    t.splice(to, 0, m)
    saveTodos(t)
  }

  // Fetch weather via API route (avoid CORS)
  useEffect(() => {
    setWeatherData(null)
    fetch('/api/weather?city=' + encodeURIComponent(weatherCity))
      .then(r => r.json())
      .then(d => {
        if (d.error) { setWeatherData({ error: true }); return }
        const cur = d.current_condition?.[0]
        const days = d.weather?.slice(0,3)
        setWeatherData({ temp: cur?.temp_C, desc: cur?.weatherDesc?.[0]?.value, days, city: weatherCity })
      }).catch(() => setWeatherData({ error: true }))
  }, [weatherCity])



  const me = getMe()
  const isAdminOrSub = me?.role_level==='admin' || me?.role_level==='subadmin'
  const isDemo = getMe()?.role_level==='demo'
  function demoBlock() {
    const meNow = getMe()
    if (meNow?.role_level==='demo') {
      alert('Demo-Modus: Keine Änderungen möglich.')
      return true
    }
    return false
  }

  useEffect(() => {
    function fetchUnread() {
      fetch('/api/email/unread').then(r=>r.json()).then(d=>{ if(d.ok) setUnreadEmail(d.unread||0) }).catch(()=>{})
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // GCal OAuth return handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal_connected') === '1') {
      // Clean URL
      window.history.replaceState({}, '', '/')
      // Load fresh token from DB
      setTimeout(async () => {
        const { data } = await supabase.from('gcal_tokens')
          .select('access_token,expires_at')
          .order('updated_at', { ascending: false })
          .limit(1).maybeSingle()
        if (data?.access_token) {
          localStorage.setItem('gcal_token', data.access_token)
          toast('✓ Google Calendar erfolgreich verbunden!')
        }
      }, 1000)
    }
  }, [])

  // Birthday check
  useEffect(() => {
    if (!staff.length) return
    const today = new Date()
    const mm = String(today.getMonth()+1).padStart(2,'0')
    const dd = String(today.getDate()).padStart(2,'0')
    const bday = staff.find(s => s.birthday && s.birthday.slice(5) === mm+'-'+dd)
    if (bday) setBirthdayPerson(bday)
  }, [staff])

  // Work session — load active + team sessions
  useEffect(() => {
    if (!me?.id) return
    loadActiveSession()
    loadTeamSessions()
    const t = setInterval(() => { setSessionTick(p => p+1); loadTeamSessions() }, 60000)
    // Live timer tick every minute
    return () => clearInterval(t)
  }, [me?.id])

  async function loadActiveSession() {
    try {
      const { data } = await supabase.from('work_sessions')
        .select('*').eq('staff_id', me.id).is('check_out', null).single()
      setActiveSession(data || null)
    } catch(e) { setActiveSession(null) }
  }

  async function loadTeamSessions() {
    try {
      const today = new Date().toISOString().slice(0,10)
      const { data } = await supabase.from('work_sessions')
        .select('*, staff:staff_id(id,name,init,color,avatar_url)')
        .gte('check_in', today+'T00:00:00').order('check_in', {ascending:false})
      setTeamSessions(data || [])
    } catch(e) {}
  }

  async function doCheckIn() {
    if (demoBlock()) return
    if (activeSession) return
    const { data } = await supabase.from('work_sessions').insert({
      staff_id: me.id, check_in: new Date().toISOString(), break_minutes: 0
    }).select().single()
    setActiveSession(data)
    addLog('Check-in: ' + new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))
    loadTeamSessions()
  }

  async function doCheckOut(note) {
    if (demoBlock()) return
    if (!activeSession) return
    const checkOut = new Date()
    const checkIn = new Date(activeSession.check_in)
    const totalMin = Math.round((checkOut - checkIn) / 60000)
    const breakMin = totalMin > 360 ? 60 : 0 // auto 60min break if >6h
    await supabase.from('work_sessions').update({
      check_out: checkOut.toISOString(),
      break_minutes: breakMin,
      note: note || null
    }).eq('id', activeSession.id)
    setActiveSession(null)
    addLog('Check-out: ' + checkOut.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))
    loadTeamSessions()
  }

  function getSessionDuration(session) {
    if (!session) return '0:00'
    const start = new Date(session.check_in)
    const end = session.check_out ? new Date(session.check_out) : new Date()
    const mins = Math.max(0, Math.round((end - start) / 60000) - (session.break_minutes||0))
    return Math.floor(mins/60) + 'h ' + String(mins%60).padStart(2,'0') + 'm'
  }

  // Amelia pending poll
  useEffect(() => {
    function fetchAmelia() {
      fetch('/api/amelia?action=appointments&status=pending&limit=20')
        .then(r=>r.json())
        .then(d=>{ if(d.ok) setAmeliaPending(d.appointments?.length||0) })
        .catch(()=>{})
    }
    fetchAmelia()
    const t = setInterval(fetchAmelia, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Online presence heartbeat
  useEffect(() => {
    if (!me?.id) return
    const updatePresence = async (status) => {
      try {
        await supabase.from('user_presence').upsert(
          { staff_id: me.id, last_seen: new Date().toISOString(), status },
          { onConflict: 'staff_id' }
        )
      } catch(e) {}
    }
    updatePresence('online')
    const interval = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current > 5*60*1000
      updatePresence(inactive ? 'away' : 'online')
    }, 30000)
    const loadPresence = async () => {
      let presenceData = null
      try { const r = await supabase.from('user_presence').select('staff_id,status,last_seen'); presenceData = r.data } catch(e) {}
      const { data }  = { data: presenceData }
      if (data) {
        const map = {}
        const now = Date.now()
        data.forEach(p => {
          const diff = now - new Date(p.last_seen).getTime()
          map[p.staff_id] = diff > 10*60*1000 ? 'offline' : diff > 2*60*1000 ? 'away' : 'online'
        })
        setOnlineUsers(map)
      }
    }
    loadPresence()
    const presInterval = setInterval(loadPresence, 30000)
    const onActivity = () => { lastActivityRef.current = Date.now() }
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      clearInterval(interval); clearInterval(presInterval)
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [me?.id, staff.length])

  // Google Maps Places API betöltése
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.google?.maps?.places) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    script.async = true
    script.onload = () => window.dispatchEvent(new Event('google-maps-loaded'))
    document.head.appendChild(script)
  }, [])

  // Load data
  useEffect(() => { loadAll() }, [])

  // Chat handled by TeamChat component


  // Notifications realtime
  useEffect(() => {
    if (!me?.id) return
    const ch = supabase.channel('notif-rt-'+me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${me.id}` }, payload => {
        const n = payload.new
        setNotifications(prev => [n, ...prev])
        setToasts(prev => [...prev, n])
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [me?.id])

  // Realtime — dupla csatorna: broadcast + postgres_changes fallback
  const rtHandlers = useRef({ loadCards, loadCols, loadStaff, loadClients })
  const mySessionId = useRef(Math.random().toString(36).slice(2))
  useEffect(() => { rtHandlers.current = { loadCards, loadCols, loadStaff, loadClients } })

  // Broadcast: saját változásainkat mi küldjük, mások megkapják
  const broadcastRef = useRef(null)
  useEffect(() => {
    const bc = supabase.channel('immopixels-broadcast', {
      config: { broadcast: { self: false } }
    })
    .on('broadcast', { event: 'cards_changed' }, () => rtHandlers.current.loadCards())
    .on('broadcast', { event: 'card_editing' }, ({ payload }) => {
      if (payload?.cardId && payload?.userId !== mySessionId.current) {
        setEditingCards(p => ({ ...p, [payload.cardId]: payload.editing }))
        if (payload.editing) {
          // 10mp után auto-clear ha nem jön 'false'
          setTimeout(() => setEditingCards(p => { const n={...p}; if(n[payload.cardId]) delete n[payload.cardId]; return n }), 10000)
        }
      }
    })
    .on('broadcast', { event: 'cols_changed' }, () => rtHandlers.current.loadCols())
    .on('broadcast', { event: 'staff_changed' }, () => rtHandlers.current.loadStaff())
    .on('broadcast', { event: 'clients_changed' }, () => rtHandlers.current.loadClients())
    .subscribe()
    broadcastRef.current = bc
    return () => supabase.removeChannel(bc)
  }, [])

  // Postgres changes fallback (ha replication be van kapcsolva Supabase-ben)
  useEffect(() => {
    const ch = supabase.channel('rt-postgres-fallback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => rtHandlers.current.loadCards())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => rtHandlers.current.loadCols())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, () => rtHandlers.current.loadCards())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => rtHandlers.current.loadStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => rtHandlers.current.loadClients())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Chat értesítő: új üzenet figyelés
  useEffect(() => {
    if (!me?.id) return
    const ch = supabase.channel('chat-unread-'+me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new
        // Ne jelezze a saját üzeneteit
        if (msg.sender_id === me.id) return
        // Növeljük az unreadChat-et (team + privát üzenetek)
        if (!chatOpen) {
          setUnreadChat(p => p + 1)
        }
        // Hang lejátszása ha nincs némítva
        if (!chatMuted && chatAudioRef.current) {
          chatAudioRef.current.currentTime = 0
          chatAudioRef.current.play().catch(()=>{})
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [me?.id, chatOpen])

  // Broadcast küldő helper — minden változás után hívjuk
  async function moveCardInColumn(card, direction) {
    if (demoBlock()) return
    const colCards = cards.filter(c => c.column_id === card.column_id).sort((a,b) => (a.position||0)-(b.position||0))
    const idx = colCards.findIndex(c => c.id === card.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= colCards.length) return
    // Swap in array
    const reordered = [...colCards]
    const tmp = reordered[idx]
    reordered[idx] = reordered[swapIdx]
    reordered[swapIdx] = tmp
    // Reassign positions cleanly 0,1,2...
    const updates = reordered.map((c, i) => ({ id: c.id, position: i }))
    setCards(p => {
      const posMap = {}
      updates.forEach(u => posMap[u.id] = u.position)
      return p.map(c => posMap[c.id] !== undefined ? { ...c, position: posMap[c.id] } : c)
    })
    await Promise.all(updates.map(u => supabase.from('cards').update({ position: u.position }).eq('id', u.id)))
    broadcastChange('cards_changed')
  }

  async function gcalSync(card, staffIds = []) {
    if (!card?.addr || !card?.card_date) return
    if (card.is_gcal) return // GCal-ból importált kártyát nem írjuk vissza
    try {
      const staffInits = (staffIds || []).map(sid => {
        const s = staff.find(x => x.id === sid)
        return s?.init
      }).filter(Boolean)
      await fetch('/api/gcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card, staffInits })
      })
    } catch (e) { /* silent */ }
  }

  function broadcastChange(event, payload = {}) {
    broadcastRef.current?.send({ type: 'broadcast', event, payload })
  }

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadCards(), loadStaff(), loadBoards(), loadClients(), loadMaklers(), loadSettings(), loadServicePrices(), loadPhonebook()])
    // loadCols-t NEM tesszük a Promise.all-ba: csak akkor fusson amikor activeBoardId már be van állítva
    // (a useEffect triggereli a loadBoards után)
    // Check birthdays
    const today = new Date()
    const mm = String(today.getMonth()+1).padStart(2,'0')
    const dd = String(today.getDate()).padStart(2,'0')
    // Will check after staff is loaded
    setLoading(false)
  }


  async function openCardFromNotification(n) {
    if (!n?.card_id) {
      await supabase.from('notifications').update({read:true}).eq('id', n.id)
      loadNotifications()
      return
    }
    await supabase.from('notifications').update({read:true}).eq('id', n.id)
    const existing = cards.find(c => c.id === n.card_id)
    if (existing) {
      setActiveCard(existing)
    } else {
      const { data } = await supabase.from('cards').select('*, card_team(staff_id), checklist_items(*)').eq('id', n.card_id).single()
      if (data) setActiveCard(data)
    }
    setTab('board')
    setView('board')
    setShowNotifDropdown(false)
    setToasts(prev => prev.filter(x => x.id !== n.id))
    loadNotifications()
  }

  async function loadNotifications() {
    if (!me?.id) return
    const { data } = await supabase.from('notifications').select('*').eq('recipient_id', me.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
  }

  async function loadServicePrices() {
    const { data } = await supabase.from('settings').select('value').eq('key','service_prices').maybeSingle()
    let saved = []
    if (data?.value) { try { saved = JSON.parse(data.value) } catch(e){} }
    const byId = {}; (saved || []).forEach(s => { if (s && s.id) byId[s.id] = s })
    const merged = SERVICE_CATALOG.map(c => byId[c.id] ? { ...c, grundpreis: byId[c.id].grundpreis ?? c.grundpreis } : c)
    ;(saved || []).forEach(s => { if (s && s.id && !SERVICE_CATALOG.some(c => c.id === s.id)) merged.push(s) })
    setServicePrices(merged)
  }
  async function saveServicePrices(prices) {
    if (demoBlock()) return
    await supabase.from('settings').upsert({ key:'service_prices', value:JSON.stringify(prices) },{ onConflict:'key' })
    setServicePrices(prices)
  }
  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    const s = {}
    for (const row of (data||[])) {
      try { s[row.key] = JSON.parse(row.value) } catch(e) {}
    }
    if (s.photo_categories) {
      // backward compat: string[] → object[]
      const cats = s.photo_categories.map(c => typeof c === 'string'
        ? { l:c, c:'#6b6b6e', bg:'#6b6b6e14', br:'#6b6b6e30' }
        : c)
      setPhotoCats(cats)
    }
    if (s.client_categories) setClientCats(s.client_categories)
    if (s.staff_roles) setStaffRoles(s.staff_roles)
    // bg_color and bg_image are per-user → loaded from user_settings only
    if (s.font_size) setFontSize(s.font_size)
    if (s.card_size) setCardSize(s.card_size)
  }
  const suppressLoadColsRef = React.useRef(false)
  const activeBoardIdRef = React.useRef(null)
  React.useEffect(() => { activeBoardIdRef.current = activeBoardId }, [activeBoardId])
  // Daniel speciális háttér — amint myRow betölt, ha DB és nincs sajat bg
  React.useEffect(() => {
    if (myRow?.init === 'DB' && !document.body.style.backgroundImage) {
      document.body.style.backgroundImage = 'url(/dani-bg.png)'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
      document.body.style.backgroundRepeat = 'no-repeat'
    }
  }, [myRow])
  async function loadCols(boardIdOverride) {
    if (suppressLoadColsRef.current) return
    const { data } = await supabase.from('columns').select('*').order('position')
    if (data) {
      const myRole = me?.role_level || 'mitarbeiter'
      const filterBoardId = boardIdOverride !== undefined ? boardIdOverride : activeBoardIdRef.current
      const visible = data.filter(col => {
        const roleOK = !col.visible_to_roles || col.visible_to_roles.length === 0 || col.visible_to_roles.includes(myRole)
        if (!roleOK) return false
        // ha még nincs aktív board, ne mutassunk semmit (különben a Hauptboard "kibukik")
        if (!filterBoardId) return false
        // szigorú szűrés: csak a kiválasztott board oszlopai
        return col.board_id === filterBoardId
      })
      setCols(visible)
    }
  }

  function showUndoToast(message, onUndo) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoToast({ message, onUndo, secs: 5 })
    let s = 5
    const interval = setInterval(() => {
      s--
      setUndoToast(prev => prev ? { ...prev, secs: s } : null)
      if (s <= 0) { clearInterval(interval); setUndoToast(null) }
    }, 1000)
    undoTimerRef.current = setTimeout(() => { setUndoToast(null) }, 5100)
  }

  // ─── Custom Drag Engine (React-state based, no direct DOM manipulation) ──
  function getCardsInCol(colId) {
    return cards.filter(c => c.column_id === colId).sort((a,b) => (a.position||0)-(b.position||0))
  }

  function getDropIndex(colId, clientY) {
    const colEl = document.querySelector('[data-colid="' + colId + '"]')
    if (!colEl) return 0
    const cardEls = [...colEl.querySelectorAll('.board-card')]
    for (let i = 0; i < cardEls.length; i++) {
      const r = cardEls[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) return i
    }
    return cardEls.length
  }

  function getColDropIndex(clientX) {
    const boardEl = document.querySelector('.bcol-board')
    if (!boardEl) return 0
    // Exclude dragged col and DOM placeholder from index calculation
    const draggedId = colDragRef.current?.id
    const colEls = [...boardEl.querySelectorAll('.bcol')].filter(el => el.dataset.colid !== draggedId)
    for (let i = 0; i < colEls.length; i++) {
      const r = colEls[i].getBoundingClientRect()
      if (clientX < r.left + r.width / 2) return i
    }
    return colEls.length
  }

  function startCustomDrag(clientX, clientY, cardEl, card) {
    if (!clientX || !clientY) return
    const r = cardEl.getBoundingClientRect()
    dragOffRef.current = { x: clientX - r.left, y: clientY - r.top }
    dragLastXRef.current = clientX
    dragTiltRef.current = 0
    dragCardRef.current = card
    dragCardElRef.current = cardEl
    isDraggingRef.current = true
    dragDidMoveRef.current = false
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    // Flying clone
    const fly = document.createElement('div')
    fly.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;width:' + r.width + 'px;left:' + (clientX - dragOffRef.current.x) + 'px;top:' + (clientY - dragOffRef.current.y) + 'px;background:#fff;border:1px solid #6b6b6e;border-radius:9px;padding:9px 11px;font-size:12px;font-weight:700;color:#1c1a16;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:transform .06s linear;will-change:transform;opacity:.95'
    fly.innerHTML = cardEl.innerHTML
    document.body.appendChild(fly)
    dragFlyRef.current = fly

    setDragging(card)
    setDragOverColId(card.column_id)
    setDragOverIndex(getDropIndex(card.column_id, clientY))
  }

  function moveCustomDrag(clientX, clientY) {
    const fly = dragFlyRef.current
    if (!fly || !isDraggingRef.current) return
    dragDidMoveRef.current = true

    fly.style.left = (clientX - dragOffRef.current.x) + 'px'
    fly.style.top = (clientY - dragOffRef.current.y) + 'px'

    const vx = clientX - dragLastXRef.current
    dragLastXRef.current = clientX
    dragTiltRef.current = dragTiltRef.current * 0.7 + vx * 0.5
    const t = Math.max(-14, Math.min(14, dragTiltRef.current))
    fly.style.transform = 'rotate(' + t + 'deg)'

    // Find target col from pointer position
    const els = document.elementsFromPoint(clientX, clientY)
    const colEl = els.find(e => e.dataset?.colid)
    if (colEl) {
      const colId = colEl.dataset.colid
      setDragOverColId(colId)
      setDragOverIndex(getDropIndex(colId, clientY))
    }
  }

  async function endCustomDrag() {
    isDraggingRef.current = false
    const fly = dragFlyRef.current
    const card = dragCardRef.current

    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    if (fly) {
      fly.style.transition = 'transform .15s, opacity .15s'
      fly.style.transform = 'rotate(0deg) scale(1)'
      fly.style.opacity = '0'
      setTimeout(() => fly.remove(), 160)
      dragFlyRef.current = null
    }

    if (card && dragDidMoveRef.current) {
      const targetColId = dragOverColId || card.column_id
      const targetIndex = dragOverIndex ?? 9999

      const colCards = cards.filter(c => c.column_id === targetColId && c.id !== card.id)
        .sort((a,b) => (a.position||0)-(b.position||0))
      colCards.splice(targetIndex, 0, { ...card, column_id: targetColId })
      const updates = colCards.map((c, i) => ({ id: c.id, position: i, column_id: targetColId }))

      setCards(prev => {
        const others = prev.filter(c => c.id !== card.id && c.column_id !== targetColId)
        const thisCol = colCards.map((c,i) => ({ ...prev.find(x=>x.id===c.id)||c, position:i, column_id:targetColId }))
        return [...others, ...thisCol]
      })

      await Promise.all(updates.map(u =>
        supabase.from('cards').update({ column_id: u.column_id, position: u.position, updated_at: new Date().toISOString() }).eq('id', u.id)
      ))
      broadcastChange('cards_changed')
      if (targetColId !== card.column_id) addLog('Karte verschoben: ' + card.title)

      // v4.1.6: függőben lévő online foglalás kihúzása a Booking oszlopból = elfogadás.
      // Meghívja a /api/booking/confirm-et (status→confirmed + ügyfél-email + GCal [BESTÄTIGT]).
      if (targetColId !== card.column_id && card.booking_source === 'online' && card.booking_status === 'pending') {
        const tgtTitle = (cols.find(c => c.id === targetColId)?.title || '').toLowerCase()
        if (!tgtTitle.includes('booking')) {
          try {
            const rc = await fetch('/api/booking/confirm', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ token: card.booking_token || undefined, cardId: card.id, confirmedByStaffId: me?.id })
            })
            const dc = await rc.json().catch(()=>({}))
            if (rc.ok && dc.ok !== false) {
              setCards(prev => prev.map(c => c.id === card.id ? { ...c, booking_status:'confirmed' } : c))
              addLog('Buchung bestätigt (Drag): ' + card.title)
            } else {
              addLog('Buchung-Bestätigung fehlgeschlagen: ' + (dc.error || rc.status))
            }
          } catch(e) { addLog('Buchung-Bestätigung Fehler: ' + e.message) }
        }
      }

      setDroppedCard(card.id)
      setTimeout(() => setDroppedCard(null), 600)
    }

    setDragging(null)
    setDragOverColId(null)
    setDragOverIndex(null)
    dragDidMoveRef.current = false
    dragCardRef.current = null
  }

  function startColDrag(e, colEl, col) {
    if (isDraggingRef.current || isColDraggingRef.current) return
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    if (!clientX) return
    const r = colEl.getBoundingClientRect()
    colDragOffRef.current = { x: clientX - r.left, y: 0 }
    colDragLastXRef.current = clientX
    colDragTiltRef.current = 0
    colDragRef.current = col
    isColDraggingRef.current = true
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    const fly = document.createElement('div')
    fly.style.cssText = 'position:fixed;pointer-events:none;z-index:9998;width:' + r.width + 'px;left:' + (clientX - colDragOffRef.current.x) + 'px;top:' + r.top + 'px;background:#fff;border:1px solid #6b6b6e;border-radius:11px;padding:10px 12px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-size:13px;font-weight:700;color:#1c1a16;transition:transform .06s linear;opacity:.95'
    fly.textContent = col.title
    document.body.appendChild(fly)
    colDragFlyRef.current = fly

    // Create DOM placeholder
    const colPh = document.createElement('div')
    colPh.id = 'col-drag-ph'
    colPh.style.cssText = 'width:' + r.width + 'px;min-width:' + r.width + 'px;height:' + r.height + 'px;border-radius:11px;background:rgba(184,137,42,.08);border:1.5px dashed #6b6b6e;flex-shrink:0;pointer-events:none'
    colEl.insertAdjacentElement('afterend', colPh)

    colDragOverIndexRef.current = getColDropIndex(clientX)
  }

  function moveColDrag(clientX) {
    if (!isColDraggingRef.current) return
    const fly = colDragFlyRef.current
    if (!fly) return
    fly.style.left = (clientX - colDragOffRef.current.x) + 'px'
    const vx = clientX - colDragLastXRef.current
    colDragLastXRef.current = clientX
    colDragTiltRef.current = colDragTiltRef.current * 0.7 + vx * 0.5
    const t = Math.max(-8, Math.min(8, colDragTiltRef.current))
    fly.style.transform = 'rotate(' + t + 'deg)'
    colDragOverIndexRef.current = getColDropIndex(clientX)

    // Move DOM placeholder
    const ph = document.getElementById('col-drag-ph')
    const board = document.querySelector('.bcol-board')
    if (!ph || !board) return
    const colEls = [...board.querySelectorAll('.bcol')]
    const afterEl = colEls.find(el => {
      const r = el.getBoundingClientRect()
      return clientX < r.left + r.width / 2
    })
    if (afterEl) board.insertBefore(ph, afterEl)
    else board.appendChild(ph)
  }

  async function endColDrag() {
    if (!isColDraggingRef.current) return
    isColDraggingRef.current = false
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''

    // Remove DOM placeholder
    const ph = document.getElementById('col-drag-ph')
    if (ph) ph.remove()

    const fly = colDragFlyRef.current
    const col = colDragRef.current
    if (fly) {
      fly.style.transition = 'opacity .15s'
      fly.style.opacity = '0'
      setTimeout(() => { try { fly.remove() } catch(e){} }, 160)
      colDragFlyRef.current = null
    }
    const targetIdx = colDragOverIndexRef.current
    colDragRef.current = null
    colDragOverIndexRef.current = null
    if (col && targetIdx !== null) {
      await moveColumnToIndex(col.id, targetIdx)
    }
  }
  // ─── End Custom Drag Engine ────────────────────────────────────

  async function ensureGCalImportCol() {
    if (demoBlock()) return
    const meNow = getMe()
    if (!meNow) return
    const { data } = await supabase.from('columns').select('*').order('position')
    const exists = (data || []).find(c => c.title === 'GCal Import')
    if (exists) return
    const maxPos = data?.length ? Math.max(...data.map(c => c.position || 0)) + 1 : 0
    await supabase.from('columns').insert({
      title: 'GCal Import',
      position: maxPos,
      visible_to_roles: [meNow.role_level],
      board_id: activeBoardId || null,
    })
    loadCols()
  }
  async function loadCards() {
    const { data } = await supabase.from('cards')
      .select('*, card_team(staff_id), checklist_items(*)')
      .is('deleted_at', null)
      .order('position')
    setCards(data || [])
    if (activeCard) {
      const upd = (data || []).find(c => c.id === activeCard.id)
      if (upd) setActiveCard(upd)
    }
  }
  async function loadStaff() {
    const { data } = await supabase.from('staff').select('*').order('name')
    setStaff(data || [])
  }
  async function loadBoards() {
    const { data } = await supabase.from('boards').select('*').order('position')
    setBoards(data || [])
    // myRow betöltése — közvetlenül az auth session-ből, NEM a state-ből
    let meRow = null
    let email = currentUser?.email
    if (!email) {
      // fallback: ha a currentUser state még nincs beállítva, közvetlenül a session-ből
      const { data: { session } } = await supabase.auth.getSession()
      email = session?.user?.email
    }
    if (email) {
      const { data: row } = await supabase.from('staff').select('id,email,role_level,allowed_boards,init,can_invoice').eq('email', email).maybeSingle()
      meRow = row
      setMyRow(row)
    }
    // aktív board választás
    if (!activeBoardId && data && data.length) {
      const isMarketing = meRow?.role_level === 'marketing'
      if (isMarketing) {
        // Marketing user: csak a Marketing board
        const marketingBoard = data.find(b => b.slug === 'marketing')
        if (marketingBoard) setActiveBoardId(marketingBoard.id)
      } else {
        // Mindenki más (admin, subadmin, mitarbeiter, demo): első board (Hauptboard)
        setActiveBoardId(data[0].id)
      }
    }
  }
  // amikor változik az aktív board, töltsük újra az oszlopokat
  useEffect(() => { if (activeBoardId) loadCols(activeBoardId) }, [activeBoardId])
  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }
  async function openBillomatImport() {
    setModal('billomat-import'); setBmList([]); setBmSel(new Set()); setBmSearch(''); setBmLoading(true)
    try {
      const r = await fetch('/api/billomat/clients?staff_id=' + me.id)
      const d = await r.json()
      if (d.ok) setBmList(d.clients || []); else alert('Fehler: ' + (d.error || r.status))
    } catch (e) { alert('Fehler: ' + e.message) }
    setBmLoading(false)
  }
  async function doBillomatImport() {
    const ids = [...bmSel]
    if (!ids.length) { alert('Bitte mindestens einen Kunden auswählen.'); return }
    setBmBusy(true)
    try {
      const r = await fetch('/api/billomat/clients/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: me.id, ids }) })
      const d = await r.json()
      if (!r.ok || d.ok === false) { alert('Fehler: ' + (d.error || r.status)); setBmBusy(false); return }
      addLog(`Billomat-Import: ${d.created} neu, ${d.matched} verknüpft, ${d.skipped} übersprungen`)
      await loadClients()
      setModal(null)
    } catch (e) { alert('Fehler: ' + e.message) }
    setBmBusy(false)
  }
  async function openInvoice(client, presetItems, cardIds) {
    setInvClient(client)
    setInvItems(presetItems && presetItems.length ? presetItems : [{ title: '', quantity: 1, unit_price: '' }])
    setInvCardIds(cardIds || [])
    setInvNote(''); setInvResult(null); setInvHist([]); setModal('invoice')
    if (client?.id) {
      setInvHistLoading(true)
      try {
        const r = await fetch(`/api/billomat/invoice/history?staff_id=${me.id}&clientId=${client.id}`)
        const d = await r.json()
        if (d.ok) setInvHist(d.items || [])
      } catch {}
      setInvHistLoading(false)
    }
  }
  function invSetItem(i, k, v) { setInvItems(prev => prev.map((it, j) => j === i ? { ...it, [k]: v } : it)) }
  function invAddItem(it) { setInvItems(prev => [...prev, it || { title: '', quantity: 1, unit_price: '' }]) }
  function invDelItem(i) { setInvItems(prev => prev.filter((_, j) => j !== i)) }
  async function createInvoice() {
    const items = invItems.filter(it => (it.title || '').trim())
    if (!items.length) { alert('Mindestens eine Position mit Bezeichnung nötig.'); return }
    setInvBusy(true)
    try {
      const r = await fetch('/api/billomat/invoice/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: me.id, clientId: invClient.id, items, note: invNote, cardIds: invCardIds }) })
      const d = await r.json()
      if (!r.ok || d.ok === false) { alert('Fehler: ' + (d.error || d.detail || r.status)); setInvBusy(false); return }
      setInvResult(d)
      addLog(`Rechnung (Entwurf) erstellt für ${d.client} — Billomat #${d.invoice_id}${d.billed ? ` (${d.billed} Karte(n) als berechnet markiert)` : ''}`)
      if (invCardIds && invCardIds.length) { try { await loadCards() } catch {} }
    } catch (e) { alert('Fehler: ' + e.message) }
    setInvBusy(false)
  }
  // Cégnév tisztítása: levágja a "Herr/Frau/Dr." + személynevet (a Billomat-importban
  // sokszor egybecsúszott, pl. "Immoztion ImmobilienHerr Jens Hotzel")
  function cleanClientName(name) {
    if (!name) return ''
    let s = String(name)
    // a Herr/Frau/Dr. szónál (akár szóköz nélkül egybeírva) levágjuk a maradékot
    s = s.replace(/\s*(Herr|Frau|Dr\.?|Hr\.?|Fr\.?)\b.*$/i, '')
    // ha egybe van írva nagybetűs határon (…ImmobilienHerr), a fenti \b nem fog — extra vágás:
    s = s.replace(/(Herr|Frau)[A-ZÄÖÜ].*$/, '')
    return s.trim() || String(name).trim()
  }
  function clientInitials(name) {
    const c = cleanClientName(name) || name || ''
    const words = c.split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  function clientFavicon(cl) {
    // a weboldal domainjéből favicon (Google S2) — megbízhatóbb, mint "profilkép-kiszedés"
    const url = cl.www || cl.website || cl.extra_link || ''
    const m = String(url).match(/^(?:https?:\/\/)?([^\/\s]+)/i)
    if (!m) return null
    return 'https://www.google.com/s2/favicons?domain=' + m[1] + '&sz=64'
  }

  // Ügyfél feloldása a kártya client_name-jéből (name VAGY short_name, normalizált fallback)
  function resolveClientObj(cn) {
    if (!cn) return null
    const nrm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    let c = clients.find(x => x.name === cn || x.short_name === cn)
    if (c) return c
    const n = nrm(cn); if (!n) return null
    return clients.find(x => nrm(x.name) === n || (x.short_name && nrm(x.short_name) === n)) || null
  }
  async function loadMonthly(month) {
    setMonthLoading(true); setMonthChecked(new Set())
    const [y, m] = month.split('-').map(Number)
    const start = month + '-01'
    const end = new Date(y, m, 0).toISOString().slice(0, 10)
    const { data } = await supabase.from('cards').select('id,title,client_name,card_date,card_type,price,booking_address,billed_at').gte('card_date', start).lte('card_date', end).is('deleted_at', null)
    const cards = (data || []).filter(c => c.card_type !== 'todo')
    const nrm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const groups = new Map()
    for (const c of cards) {
      const cl = resolveClientObj(c.client_name)
      const key = cl ? 'id:' + cl.id : (c.client_name ? 'raw:' + nrm(c.client_name) : '__none__')
      if (!groups.has(key)) groups.set(key, { name: cl?.name || c.client_name || 'Ohne Kunde', client: cl, none: !c.client_name, cards: [] })
      groups.get(key).cards.push(c)
    }
    const list = [...groups.values()].sort((a, b) => (a.name === 'Ohne Kunde' ? 1 : 0) - (b.name === 'Ohne Kunde' ? 1 : 0) || a.name.localeCompare(b.name, 'de'))
    // alapból csak a NEM számlázott + Billomathoz kötött kártyák legyenek kipipálva
    setMonthGroups(list)
    setMonthChecked(new Set(cards.filter(c => !c.billed_at && resolveClientObj(c.client_name)?.billomat_client_id).map(c => c.id)))
    setMonthLoading(false)
  }
  // Ügyfél szerinti nézet: az adott kliens ÖSSZES még nem számlázott fotózása (hónaptól függetlenül)
  async function loadMonthlyByClient(clientId) {
    setMonthChecked(new Set()); setMonthGroups([])
    if (!clientId) return
    setMonthLoading(true)
    const cl = clients.find(c => c.id === clientId)
    const { data } = await supabase.from('cards').select('id,title,client_name,card_date,card_type,price,booking_address,billed_at').is('deleted_at', null)
    const cards = (data || []).filter(c => c.card_type !== 'todo' && resolveClientObj(c.client_name)?.id === clientId)
      .sort((a, b) => (a.card_date || '').localeCompare(b.card_date || ''))
    const group = { name: cl?.name || '', client: cl, none: false, cards }
    setMonthGroups(cards.length ? [group] : [])
    setMonthChecked(new Set(cl?.billomat_client_id ? cards.filter(c => !c.billed_at).map(c => c.id) : []))
    setMonthLoading(false)
  }
  function openMonthly() {
    const m = new Date().toISOString().slice(0, 7)
    setMonthMode('month'); setMonthClientId(''); setMonthSel(m); setModal('monthly'); loadMonthly(m)
  }
  // Ár feloldása: kártya ára (ha >0) -> ügyfél service_prices -> globális grundpreis
  function priceForCard(c, client) {
    if (c && c.price > 0) return c.price
    const n = (c?.card_type || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const hasFoto = n.includes('foto'), hasDrohne = /droh?ne|dron|drone/.test(n), hasReel = n.includes('reel')
    const tryIds = [n]
    if (hasFoto && hasDrohne) tryIds.push('fotodron', 'fotodrohne')
    else if (hasDrohne) tryIds.push('dron', 'drohne')
    else if (hasReel && !hasFoto) tryIds.push('reel')
    else if (hasFoto) tryIds.push('foto')
    const cp = client?.service_prices || {}
    for (const id of tryIds) { const v = parseFloat(cp[id]); if (v > 0) return v }
    for (const id of tryIds) { const svc = (servicePrices || []).find(s => s.id === id); const v = parseFloat(svc?.grundpreis); if (v > 0) return v }
    return ''
  }
  // Tétel a havi gyűjtőszámlához: cím = "DD.MM.YYYY. - Kürzel - Adresse", leírás = szolgáltatás-összetétel
  function buildInvoiceItem(c, group) {
    const clientShort = group.client?.short_name || (group.client?.name || '').trim().split(/\s+/)[0] || c.client_name || ''
    const dd = c.card_date ? c.card_date.split('-').reverse().join('.') + '.' : ''
    let addr = (c.booking_address || c.title || '').trim()
    for (const p of [clientShort, group.client?.name, c.client_name].filter(Boolean)) {
      const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp('^' + esc + '\\s*[-–—]\\s*', 'i')
      if (re.test(addr)) { addr = addr.replace(re, '').trim(); break }
    }
    addr = addr.replace(/\s*[-–—]?\s*(foto\s*\+\s*reel|foto-?reel|foto-?dron\w*|reel|drohne|drone)\s*$/i, '').trim()
    const line1 = [dd, clientShort, addr].filter(Boolean).join(' - ')
    const tt = ((c.card_type || '') + ' ' + (c.title || '')).toLowerCase()
    const hasReel = /reel/.test(tt)
    const hasDrohne = /drohne|drone|dron/.test(tt)
    const isEditing = /edit|bearbeitung|postpro/.test(tt) && !/foto/.test(c.card_type || '')
    let parts
    if (isEditing) parts = ['Postproduktion']
    else { parts = ['Immobilienfotografie']; if (hasDrohne) parts.push('Drohne'); if (hasReel) parts.push('Reel'); parts.push('Postproduktion') }
    return { title: line1, description: parts.join(' + '), quantity: 1, unit_price: priceForCard(c, group.client) }
  }
  function monthlyCreateForClient(group) {
    const checked = group.cards.filter(c => monthChecked.has(c.id))
    if (!checked.length) { alert('Keine Karte ausgewählt.'); return }
    openInvoice(group.client, checked.map(c => buildInvoiceItem(c, group)), checked.map(c => c.id))
  }
  // Cím/title alapján ügyfél-tipp: short_name/teljes név, majd a név ELSŐ (márka)szava
  // Cím/title -> ügyfél tipp. Kezeli a "#szám" utótagot (Riegel#061), a kötőjeles
  // kódokat (EV-Da, EV-KI, Kensington-LD), és a vezető zajt (pl. "Schlüssel - Riegel#061…").
  function guessClientName(title) {
    const raw = (title || '').toLowerCase()
    if (!raw.trim()) return ''
    const cleaned = raw.replace(/#\s*\d+/g, ' ')                 // "riegel#061" -> "riegel "
    const words = cleaned.split(/[^a-z0-9äöüß-]+/).filter(Boolean).map(w => w.replace(/^-+|-+$/g, ''))
    // 1) pontos SZÓ-egyezés a short_name-re (a kód jellemzően egy szó: si, ev-ki, npi…)
    let m = clients.find(c => { const sn = (c.short_name || '').toLowerCase(); return sn && words.includes(sn) })
    // 2) a CRM-név első (márka)szava pontos szóként a title-ben
    if (!m) m = clients.find(c => { const fw = (c.name || '').trim().split(/\s+/)[0].toLowerCase(); return fw && fw.length >= 3 && words.includes(fw) })
    // 3) tartalmazás hosszabb short_name-re / teljes névre (fallback)
    if (!m) m = clients.find(c => (c.short_name && c.short_name.length >= 3 && raw.includes(c.short_name.toLowerCase())) || (c.name && raw.includes(c.name.toLowerCase())))
    return m ? (m.short_name || m.name) : ''
  }
  async function openFixClients() {
    setModal('fix-clients'); setFixList([]); setFixSel(new Set()); setFixLoading(true)
    const resolves = cn => cn && clients.some(c => c.name === cn || c.short_name === cn)
    const { data } = await supabase.from('cards').select('id,title,client_name,card_date,card_type').is('deleted_at', null)
    const props = []
    for (const c of (data || [])) {
      if (c.card_type === 'todo') continue
      if (resolves(c.client_name)) continue // már jó CRM-Kundéhoz kötve
      const guess = guessClientName(c.title)
      if (guess && guess !== c.client_name) props.push({ cardId: c.id, title: c.title, date: c.card_date, current: c.client_name || '', proposed: guess })
    }
    props.sort((a, b) => a.proposed.localeCompare(b.proposed, 'de') || (a.date || '').localeCompare(b.date || ''))
    setFixList(props); setFixSel(new Set(props.map(p => p.cardId))); setFixLoading(false)
  }
  async function applyFixClients() {
    const approved = fixList.filter(p => fixSel.has(p.cardId))
    if (!approved.length) { alert('Nichts ausgewählt.'); return }
    setFixBusy(true)
    let ok = 0
    for (const p of approved) {
      const { error } = await supabase.from('cards').update({ client_name: p.proposed }).eq('id', p.cardId)
      if (!error) ok++
    }
    addLog(`Karten-Kunden repariert: ${ok}`)
    if (activeBoardId) await loadCols(activeBoardId)
    setFixBusy(false); setModal(null)
    alert(`${ok} Karte(n) aktualisiert.`)
  }
  async function openDuplicates() {
    setModal('duplicates'); setDupGroups([]); setDupDel(new Set()); setDupLoading(true)
    const { data } = await supabase.from('cards').select('id,title,client_name,card_date,card_type,booking_address,updated_at,created_at').is('deleted_at', null)
    const addrKey = c => (c.booking_address || c.title || '').toLowerCase()
      .replace(/\b(reel|drohne|drone|fotoreel|foto-reel|fotodron\w*|foto-dron\w*|postproduktion|editing|bearbeitung)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
    const map = new Map()
    for (const c of (data || [])) {
      if (c.card_type === 'todo' || !c.card_date) continue
      const ak = addrKey(c)
      if (ak.length < 4) continue
      const key = ak + '|' + c.card_date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    }
    const groups = []
    const toDel = new Set()
    for (const [, arr] of map) {
      if (arr.length < 2) continue
      // legutóbb módosított marad (updated_at, fallback created_at)
      arr.sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      arr.forEach((c, i) => { if (i > 0) toDel.add(c.id) }) // a 0. (legfrissebb) marad
      groups.push(arr)
    }
    groups.sort((a, b) => (a[0].card_date || '').localeCompare(b[0].card_date || ''))
    setDupGroups(groups); setDupDel(toDel); setDupLoading(false)
  }
  async function applyDupDelete() {
    const ids = [...dupDel]
    if (!ids.length) { alert('Nichts zum Löschen ausgewählt.'); return }
    if (!confirm(`${ids.length} Karte(n) löschen (archivieren)?`)) return
    setDupBusy(true)
    let ok = 0
    for (const id of ids) {
      const { error } = await supabase.from('cards').update({ deleted_at: new Date().toISOString(), deleted_by: me?.init || '?' }).eq('id', id)
      if (!error) ok++
    }
    addLog(`Duplikate gelöscht: ${ok}`)
    if (activeBoardId) await loadCols(activeBoardId)
    broadcastChange('cards_changed')
    setDupBusy(false); setModal(null)
    alert(`${ok} Karte(n) archiviert.`)
  }

  async function loadMaklers() {
    const { data } = await supabase.from('client_maklers').select('*').order('name')
    const grouped = {}
    for (const m of data || []) {
      if (!grouped[m.client_id]) grouped[m.client_id] = []
      grouped[m.client_id].push(m)
    }
    setMaklers(grouped)
  }

  async function loadPhonebook() {
    const { data } = await supabase.from('phone_book').select('*').order('name')
    if (data) setPhonebook(data)
  }

  async function addLog(msg) {
    const me = getMe()
    const entry = new Date().toLocaleTimeString('hu-HU') + ' — ' + (me?.name || '?') + ': ' + msg
    setDebugLog(prev => [entry, ...prev].slice(0, 200))
    // Save to Supabase
    try {
      await supabase.from('debug_log').insert({
        staff_name: me?.name || 'System',
        staff_init: me?.init || '?',
        action: msg,
        details: null,
      })
    } catch(e) {}
  }

  function getStaff(id) { return staff.find(s => s.id === id) || { init: '?', color: '#999', name: '?', avatar_url: null } }
  function getStaffByInit(init) { return staff.find(s => s.init === init) }
  useEffect(() => {
    const meNow = getMe()
    if (!meNow?.id) return
    supabase.from('user_settings').select('*').eq('staff_id', meNow.id).maybeSingle().then(({ data: us }) => {
      // ha van user_settings, alkalmazzuk; ha nincs, üres objektummal hívjuk (hogy Daniel bg ráragadjon)
      applyUserSettings(us || {}, meNow)
    })
    loadNotifications()
  }, [staff])

  const moveCustomDragRef = React.useRef(null)
  const endCustomDragRef = React.useRef(null)
  moveCustomDragRef.current = moveCustomDrag
  endCustomDragRef.current = endCustomDrag

  const moveColDragRef = React.useRef(null)
  const endColDragRef = React.useRef(null)
  moveColDragRef.current = moveColDrag
  endColDragRef.current = endColDrag

  useEffect(() => {
    function onMove(e) {
      // Only preventDefault when actually dragging — otherwise allow scroll
      if (isDraggingRef.current || isColDraggingRef.current) {
        if (e.cancelable) e.preventDefault()
      }
      const c = e.touches ? e.touches[0] : e
      if (isDraggingRef.current) moveCustomDragRef.current?.(c.clientX, c.clientY)
      if (isColDraggingRef.current) moveColDragRef.current?.(c.clientX)
    }
    function onUp(e) {
      if (isDraggingRef.current) endCustomDragRef.current?.()
      if (isColDraggingRef.current) endColDragRef.current?.()
    }
    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  async function logUserAction(action) {
    const meNow = getMe()
    if (!meNow) return
    try {
      await supabase.from('debug_log').insert({
        action,
        staff_init: meNow.init,
        staff_name: meNow.name,
        staff_id: meNow.id,
        created_at: new Date().toISOString()
      })
    } catch(e) {}
  }

  function applyUserSettings(us, currentUser) {
    if (!us) return
    const bgMap = { linen:'#f4f2ef', bluegray:'#f0f4f8', sand:'#f5f0eb', sage:'#eef4ee', lavender:'#f8f0f5', dark:'#1c1a16', white:'#fff' }
    const fsMap = { sm:'13px', md:'14px', lg:'16px' }
    setBgColor(us.bg_color || 'linen')
    setFontSize(us.font_size || 'md')
    setCardSize(us.card_size || 'standard')
    setColWidgetHeader(!!us.col_widget_header)
    setCompactEnabled(!!us.compact_cards_enabled)
    // Daniel's special background — only for DB
    if ((currentUser?.init === 'DB' || getMe()?.init === 'DB' || myRow?.init === 'DB') && !us.bg_image) {
      document.body.style.backgroundImage = 'url(/dani-bg.png)'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
      document.body.style.backgroundRepeat = 'no-repeat'
    }
    // Only log if background actually changed
    const prevBg = window.__lastBg
    const curBg = us.bg_image ? us.bg_image.split('/').pop() : us.bg_color
    if ((us.bg_color || us.bg_image) && prevBg !== curBg) {
      window.__lastBg = curBg
      addLog('Hintergrund: ' + curBg)
    }
    if (us.bg_image) {
      document.body.style.backgroundImage = 'url(' + us.bg_image + ')'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
      document.body.style.backgroundRepeat = 'no-repeat'
    } else {
      document.body.style.backgroundImage = 'none'
      document.documentElement.style.setProperty('--bg', bgMap[us.bg_color] || '#f4f2ef')
    }
    document.documentElement.style.setProperty('--font-size-base', fsMap[us.font_size] || '14px')
    document.documentElement.style.setProperty('--card-padding', {compact:'7px 8px',standard:'9px 10px',large:'12px 13px'}[us.card_size] || '9px 10px')
    document.documentElement.style.setProperty('--card-title-size', {compact:'11px',standard:'12px',large:'14px'}[us.card_size] || '12px')
    if (us.bg_color === 'dark') { document.documentElement.style.setProperty('--t1','#f4f2ef'); document.documentElement.style.setProperty('--bg2','#2a2820'); document.documentElement.style.setProperty('--bg3','#333028') }
  }

  function getMe() {
    if (!currentUser || !staff.length) return null
    return staff.find(s => s.email === currentUser.email) || null
  }

  // StaffAv moved to top-level

  function cardsForCol(colId) {
    const col = cols.find(c => c.id === colId)
    const filtered = cards.filter(c => c.column_id === colId)
    const mode = colSort[colId]
    if (mode === 'newest') {
      return filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    }
    if (mode === 'manual') {
      return filtered.sort((a, b) => (a.position || 0) - (b.position || 0))
    }
    const isShootings = col?.title?.toLowerCase().includes('shooting')
    if (isShootings) {
      const now = new Date()
      return filtered.sort((a, b) => {
        const da = a.card_date ? new Date((a.card_date) + 'T' + (a.card_time || '00:00') + ':00') : null
        const db = b.card_date ? new Date((b.card_date) + 'T' + (b.card_time || '00:00') + ':00') : null
        const aFuture = da && da >= now
        const bFuture = db && db >= now
        // Future dates first, sorted ascending (closest first)
        if (aFuture && bFuture) return da - db
        // Past dates last, sorted ascending
        if (!aFuture && !bFuture) {
          if (da && db) return da - db
          if (da) return -1
          if (db) return 1
          return (a.position||0)-(b.position||0)
        }
        // Future before past
        if (aFuture) return -1
        return 1
      })
    }
    return filtered.sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  function cardOverdueDays(card) {
    if (!card.card_date || card.is_todo) return 0
    const col = cols.find(c => c.id === card.column_id)
    const colTitle = (col?.title || '').toLowerCase()
    if (colTitle.includes('fertig') || colTitle.includes('terminier') || colTitle.includes('archiv')) return 0
    const diffH = (new Date() - new Date(card.card_date + 'T00:00:00')) / 3600000
    return diffH / 24
  }

  function cardBorder(card) {
    const days = cardOverdueDays(card)
    if (days >= 5) return '1.5px solid #e24b4a'
    if (days >= 2) return '1.5px solid #e24b4a'
    if (cardLateWarning(card)) return '1.5px solid #f97316'
    // Reel ausstehend — yellow border after 4 days
    const isReel = card.card_type && (card.card_type.includes('reel') || card.card_type === 'reel')
    if (isReel && card.drive_link && !card.is_todo) {
      const daysSince = card.card_date ? Math.floor((Date.now()-new Date(card.card_date).getTime())/86400000) : 0
      const reelDone = (card.checklist_items||[]).some(ci=>ci.text==='Reel Fertig'&&ci.done)
      if (daysSince >= 4 && !reelDone) return '1.5px solid #eab308'
    }
    return '1px solid var(--border)'
  }

  function cardOverdueBg(card) {
    const days = cardOverdueDays(card)
    if (days >= 5) return '#fcebeb'
    if (cardLateWarning(card)) return 'var(--bg2)'
    return 'var(--bg2)'
  }

  function cardLateWarning(card) {
    if (!card.card_date || card.is_todo) return false
    const col = cols.find(c => c.id === card.column_id)
    const colTitle = (col?.title || '').toLowerCase()
    // Skip if already in Beim Bearbeiter, Fertig, Archiviert, Terminier
    if (colTitle.includes('beim bearbeit') || colTitle.includes('bearbeit') || colTitle.includes('fertig') || colTitle.includes('archiv') || colTitle.includes('terminier')) return false
    // Check if today and after 18:00
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (card.card_date !== today) return false
    return now.getHours() >= 18
  }

  async function moveColumnToIndex(colId, newIndex) {
    if (demoBlock()) return
    const sorted = [...cols].sort((a, b) => (a.position || 0) - (b.position || 0))
    const fromIdx = sorted.findIndex(c => c.id === colId)
    if (fromIdx === -1) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(newIndex, 0, moved)
    const finalCols = reordered.map((c, i) => ({ ...c, position: i }))
    // Optimistic update
    setCols(finalCols)
    // Suppress realtime reloads while writing all positions
    suppressLoadColsRef.current = true
    try {
      await Promise.all(finalCols.map(c => supabase.from('columns').update({ position: c.position }).eq('id', c.id)))
      addLog('Spalte verschoben: ' + moved.title)
      broadcastChange('cols_changed')
    } finally {
      // Release after a short delay so any in-flight postgres_changes events are skipped
      setTimeout(() => { suppressLoadColsRef.current = false }, 800)
    }
  }

  function getColInsertIndex(boardEl, x) {
    const colEls = [...boardEl.querySelectorAll('.bcol:not(.col-drag-ghost)')]
    for (let i = 0; i < colEls.length; i++) {
      const r = colEls[i].getBoundingClientRect()
      if (x < r.left + r.width / 2) return i
    }
    return colEls.length
  }

  function startColDrag(e, colEl, col) {
    if (isDraggingRef.current) return
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const clientY = e.touches?.[0]?.clientY ?? e.clientY
    const r = colEl.getBoundingClientRect()
    colDragOffRef.current = { x: clientX - r.left, y: clientY - r.top }
    colDragLastXRef.current = clientX
    colDragTiltRef.current = 0
    colDragRef.current = col
    isColDraggingRef.current = true

    colEl.classList.add('col-drag-ghost')

    // Placeholder
    const ph = document.createElement('div')
    ph.style.cssText = 'width:' + r.width + 'px;min-width:' + r.width + 'px;height:' + r.height + 'px;border-radius:11px;background:rgba(184,137,42,.08);border:1.5px dashed #6b6b6e;flex-shrink:0;transition:opacity .2s'
    ph.classList.add('col-drag-ph')
    colEl.parentNode.insertBefore(ph, colEl.nextSibling)
    colDragPhRef.current = ph

    // Flying clone — just header
    const fly = document.createElement('div')
    fly.style.cssText = 'position:fixed;pointer-events:none;z-index:9998;width:' + r.width + 'px;left:' + (clientX - colDragOffRef.current.x) + 'px;top:' + r.top + 'px;background:#fff;border:1px solid #6b6b6e;border-radius:11px;padding:10px 12px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-size:13px;font-weight:700;color:#1c1a16;transition:transform .06s linear;opacity:.95'
    fly.textContent = col.title
    document.body.appendChild(fly)
    colDragFlyRef.current = fly
  }

  function moveColDrag(clientX, clientY) {
    const fly = colDragFlyRef.current
    if (!fly || !isColDraggingRef.current) return
    fly.style.left = (clientX - colDragOffRef.current.x) + 'px'

    const vx = clientX - colDragLastXRef.current
    colDragLastXRef.current = clientX
    colDragTiltRef.current = colDragTiltRef.current * 0.7 + vx * 0.5
    const t = Math.max(-8, Math.min(8, colDragTiltRef.current))
    fly.style.transform = 'rotate(' + t + 'deg)'

    // Move placeholder
    const ph = colDragPhRef.current
    const board = document.querySelector('.bcol-board')
    if (!ph || !board) return
    const idx = getColInsertIndex(board, clientX)
    const colEls = [...board.querySelectorAll('.bcol:not(.col-drag-ghost)')]
    if (idx < colEls.length) board.insertBefore(ph, colEls[idx])
    else board.appendChild(ph)
  }

  async function endColDrag() {
    const fly = colDragFlyRef.current
    const ph = colDragPhRef.current
    const col = colDragRef.current
    isColDraggingRef.current = false

    if (fly) { fly.style.opacity = '0'; setTimeout(() => fly.remove(), 150); colDragFlyRef.current = null }

    const ghost = document.querySelector('.col-drag-ghost')

    if (ph && ph.parentNode && col) {
      const board = ph.parentNode
      // Get the placeholder's index among all column-like children (bcol + placeholder), excluding the ghost
      const siblings = [...board.children].filter(el => el === ph || (el.classList && el.classList.contains('bcol') && !el.classList.contains('col-drag-ghost')))
      const newIdx = siblings.indexOf(ph)
      ph.remove()
      colDragPhRef.current = null
      if (ghost) ghost.classList.remove('col-drag-ghost')
      if (newIdx >= 0) await moveColumnToIndex(col.id, newIdx)
    } else {
      if (ph) ph.remove()
      colDragPhRef.current = null
      if (ghost) ghost.classList.remove('col-drag-ghost')
    }
    colDragRef.current = null
  }

  async function onDrop(e, colId) {
    if (demoBlock()) return
    e.preventDefault()
    e.stopPropagation()
    document.querySelectorAll('.bcol').forEach(el => { el.style.borderColor=''; el.style.boxShadow='' })
    if (!dragging) return
    const cardId = dragging.id
    const fromColId = dragging.column_id
    setDragging(null)
    setDroppedCard(cardId)
    setTimeout(() => setDroppedCard(null), 600)
    // Optimistic update
    if (fromColId !== colId) {
      setCards(p => p.map(c => c.id===cardId ? {...c, column_id:colId} : c))
      await supabase.from('cards').update({ column_id: colId, updated_at: new Date().toISOString() }).eq('id', cardId)
      // Auto-checklist: amikor "Beim Bearbeiter" / "In Bearbeitung" / "Fertig" oszlopokba kerül
      // a kártya, automatikusan kipipáljuk a megfelelő checklist elemeket
      const targetCol = cols.find(c => c.id === colId)
      const colTitle = (targetCol?.title || '').toLowerCase()
      const card = cards.find(c => c.id === cardId)
      const items = card?.checklist_items || []
      const tickItem = async (textVariants) => {
        const item = items.find(ci => textVariants.some(t => ci.text === t) && !ci.done)
        if (item) await supabase.from('checklist_items').update({ done: true }).eq('id', item.id)
      }
      if (colTitle.includes('beim bearbeit') || colTitle.includes('für bearbeit')) {
        // áthúzva a "Beim Bearbeiter" oszlopra → "Für Bearbeitung gesendet" + "Fotografiert" kipipál
        await tickItem(['Fotografiert'])
        await tickItem(['Für Bearbeitung gesendet', 'Beim Bearbeiten'])
      } else if (colTitle.includes('in bearbeit')) {
        await tickItem(['Fotografiert'])
        await tickItem(['Für Bearbeitung gesendet', 'Beim Bearbeiten'])
        await tickItem(['In Bearbeitung'])
      } else if (colTitle.includes('fertig') || colTitle.includes('rausgeschickt') || colTitle.includes('terminie')) {
        await tickItem(['Fotografiert'])
        await tickItem(['Für Bearbeitung gesendet', 'Beim Bearbeiten'])
        await tickItem(['In Bearbeitung'])
        await tickItem(['Reel in Bearbeitung'])
        await tickItem(['Rausgeschickt'])
      }
      broadcastChange('cards_changed')
      loadCards() // hogy a frissített checklist-ek látszódjanak
      addLog('Karte verschoben: ' + dragging.title)
    }
  }

  async function moveTo(colId) {
    if (!activeCard) return
    await supabase.from('cards').update({ column_id: colId, updated_at: new Date().toISOString() }).eq('id', activeCard.id)
    broadcastChange('cards_changed')
    addLog('Status: ' + activeCard.title)
    setActiveCard(prev => ({ ...prev, column_id: colId }))
    loadCards()
  }

  function onNoteChange(cardId, val) {
    if (isDemo) return
    // Optimistic update + dirty indicator + broadcast
    setCards(p => p.map(c => c.id === cardId ? { ...c, note: val } : c))
    setActiveCard(prev => prev?.id === cardId ? { ...prev, note: val } : prev)
    setDirtyCards(p => ({ ...p, [cardId]: true }))
    // Broadcast: jelezzük másoknak hogy szerkesztjük
    broadcastChange('card_editing', { cardId, editing: true, userId: mySessionId.current })
    clearTimeout(noteTimerRef.current[cardId])
    noteTimerRef.current[cardId] = setTimeout(async () => {
      await supabase.from('cards').update({ note: val }).eq('id', cardId)
      setDirtyCards(p => { const n={...p}; delete n[cardId]; return n })
      broadcastChange('card_editing', { cardId, editing: false, userId: mySessionId.current })
      broadcastChange('cards_changed')
      // Log note change
      const meNow = getMe()
      if (meNow && val) {
        const card = cards.find(c => c.id === cardId)
        addLog('Schnellnotiz zu "' + (card?.title || cardId) + '": ' + val.slice(0, 40))
      }
      // Értesítés küldése a kártya többi tagjának
      if (meNow && val) {
        const card = cards.find(c => c.id === cardId)
        if (card) {
          const { data: team } = await supabase.from('card_team').select('staff_id').eq('card_id', cardId)
          for (const t of (team || [])) {
            if (t.staff_id !== meNow.id) {
              await supabase.from('notifications').insert({
                recipient_id: t.staff_id,
                sender_id: meNow.id,
                type: 'card_note',
                card_id: cardId,
                message: meNow.name + ' hat eine Schnellnotiz zu "' + (card.title || '') + '" hinzugefügt',
                read: false,
              })
            }
          }
        }
      }
    }, 800)
  }

  function onNoteEnter(e, cardId) {
    if (isDemo) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      clearTimeout(noteTimerRef.current[cardId])
      const val = e.target.value
      setCards(p => p.map(c => c.id === cardId ? { ...c, note: val } : c))
      setActiveCard(prev => prev?.id === cardId ? { ...prev, note: val } : prev)
      supabase.from('cards').update({ note: val }).eq('id', cardId).then(() => {
        broadcastChange('cards_changed')
      })
      e.target.blur()
    }
  }

  async function toggleCL(itemId, done) {
    if (isDemo) return
    await supabase.from('checklist_items').update({ done }).eq('id', itemId)
    loadCards()
  }
  async function addCL(cardId, text) {
    if (!text?.trim()) return
    await supabase.from('checklist_items').insert({ card_id: cardId, text: text.trim(), done: false })
    loadCards()
  }
  async function delCL(itemId) {
    await supabase.from('checklist_items').delete().eq('id', itemId)
    loadCards()
  }

  async function deleteCard(cardId, title) {
    if (demoBlock()) return
    // Find or create Archiviert column
    let archCol = cols.find(c => c.title.trim().toLowerCase() === 'archiviert')
    if (!archCol) {
      const { data: allCols } = await supabase.from('columns').select('*')
      archCol = (allCols || []).find(c => c.title.trim().toLowerCase() === 'archiviert')
    }
    if (!archCol) {
      const { data: mx } = await supabase.from('columns').select('position').order('position', { ascending: false }).limit(1)
      const { data: newCol } = await supabase.from('columns').insert({ title: 'Archiviert', position: (mx?.[0]?.position || 0) + 1, color: 'granite', board_id: activeBoardId || null }).select().single()
      archCol = newCol
      await loadCols()
    }
    const card = cards.find(c => c.id === cardId)
    const origColId = card?.column_id
    await supabase.from('cards').update({ column_id: archCol.id }).eq('id', cardId)
    addLog('Karte archiviert: ' + title)
    setActiveCard(null)
    loadCards()
    broadcastChange('cards_changed')
    showUndoToast('Karte archiviert: ' + (title || ''), async () => {
      if (origColId) {
        await supabase.from('cards').update({ column_id: origColId }).eq('id', cardId)
        loadCards(); broadcastChange('cards_changed')
      }
    })
  }

  async function hardDeleteCard(cardId, title) {
    if (demoBlock()) return
    await supabase.from('cards').update({ deleted_at: new Date().toISOString(), deleted_by: me?.init || '?' }).eq('id', cardId)
    addLog('Karte endgültig gelöscht: ' + title)
    loadCards()
    broadcastChange('cards_changed')
    showUndoToast('Karte gelöscht: ' + (title || ''), async () => {
      await supabase.from('cards').update({ deleted_at: null, deleted_by: null }).eq('id', cardId)
      loadCards(); broadcastChange('cards_changed')
    })
  }

  async function openGcalPicker() {
    setGcalPickerOpen(true)
    setGcalPickerLoading(true)
    try {
      const token = localStorage.getItem('gcal_token')
      if (!token) { setGcalPickerEvents([]); setGcalPickerLoading(false); return }
      const now = new Date()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      const CALS = [
        { id: 'immopixels@gmail.com', label: 'CD' },
        { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966%40group.calendar.google.com', label: 'DB' },
        { id: '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b%40group.calendar.google.com', label: 'EL' },
        { id: '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61%40group.calendar.google.com', label: 'NS' },
      ]
      const existingGcalIds = new Set(cards.filter(c=>c.gcal_id).map(c=>c.gcal_id))
      const events = []
      for (const cal of CALS) {
        try {
          const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal.id}/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`, { headers: { Authorization: 'Bearer ' + token } })
          if (!r.ok) continue
          const { items = [] } = await r.json()
          for (const ev of items) {
            if (!ev.location) continue
            const isDup = existingGcalIds.has(ev.id)
            events.push({
              id: ev.id,
              summary: ev.summary || ev.location,
              description: ev.description || '',
              location: ev.location,
              date: (ev.start?.dateTime || ev.start?.date || '').slice(0,10),
              time: ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'}) : null,
              cal: cal.label,
              isDup,
            })
          }
        } catch(e) {}
      }
      events.sort((a,b) => a.date.localeCompare(b.date))
      setGcalPickerEvents(events)
    } catch(e) { setGcalPickerEvents([]) }
    setGcalPickerLoading(false)
  }

  async function createCardFromGcal(ev) {
    if (demoBlock()) return
    if (ev.isDup) return
    const shootingsCol = cols.find(c => c.title.toLowerCase().includes('shooting')) || cols[0]
    if (!shootingsCol) return
    const { data: card } = await supabase.from('cards').insert({
      column_id: shootingsCol.id,
      title: ev.summary,
      addr: ev.location,
      card_date: ev.date,
      card_time: ev.time,
      card_type: (() => {
        const t = ((ev.summary||'')+' '+(ev.description||'')).toLowerCase()
        const hasDrone = t.includes('drohne')||t.includes('drone')
        const hasReel = t.includes('reel')
        const hasFoto = t.includes('foto')||t.includes('photo')
        if(hasDrone&&hasReel) return 'foto-reel'
        if(hasDrone) return 'foto-dron'
        if(hasReel&&hasFoto) return 'foto-reel'
        if(hasReel) return 'reel'
        return 'foto'
      })(),
      description: ev.description || '',
      is_gcal: true,
      gcal_id: ev.id,
      position: 9999,
      note: '', price: 0, is_todo: false,
      client_name: (() => {
        const title = (ev.summary||'').toLowerCase()
        const match = clients.find(c =>
          (c.short_name && title.includes(c.short_name.toLowerCase())) ||
          (c.name && title.includes(c.name.toLowerCase()))
        ) || clients.find(c => { const w=(c.name||'').trim().split(/\s+/)[0]; return w && w.length>=3 && title.includes(w.toLowerCase()) }
        ) || clients.find(c =>
          c.short_name && c.short_name.toLowerCase().split(' ').some(w => w.length>2 && title.includes(w))
        )
        return match ? (match.short_name||match.name) : ''
      })(),
    }).select().single()
    if (card) {
      for (const text of getAutoChecklist(card.card_type||'foto')) await supabase.from('checklist_items').insert({ card_id: card.id, text, done: false })
      // Add staff to card_team based on calendar owner
      if (ev.cal) {
        const staffMember = staff.find(s => s.init === ev.cal)
        if (staffMember) await supabase.from('card_team').insert({ card_id: card.id, staff_id: staffMember.id })
      }
      addLog('Karte aus Kalender: ' + ev.summary)
      loadCards()
      setGcalPickerEvents(prev => prev.map(e => e.id === ev.id ? {...e, isDup: true} : e))
    }
  }

  async function createCard(fd) {
    if (demoBlock()) return
    const teamInits = [...document.querySelectorAll('#nc-team .chip.on')].map(x => x.dataset.p)
    const colIdx = parseInt(fd.get('col') || '0')
    const col = cols[colIdx]
    if (!col) return
    const ct = fd.get('cardtype') || 'foto'
    const hasAddr = (fd.get('addr') || '').trim().length > 0
    const { data: card } = await supabase.from('cards').insert({
      column_id: col.id,
      title: fd.get('title'),
      addr: fd.get('addr') || '',
      description: fd.get('desc') || '',
      client_name: (() => {
        const manual = fd.get('client') || ''
        if (manual) return manual
        // Auto-match client from title
        const title = (fd.get('title') || '').toLowerCase()
        const match = clients.find(c =>
          (c.short_name && title.includes(c.short_name.toLowerCase())) ||
          (c.name && title.includes(c.name.toLowerCase()))
        ) || clients.find(c => { const w=(c.name||'').trim().split(/\s+/)[0]; return w && w.length>=3 && title.includes(w.toLowerCase()) }
        ) || clients.find(c =>
          c.short_name && c.short_name.toLowerCase().split(' ').some(w => w.length>2 && title.includes(w))
        )
        return match ? (match.short_name || match.name) : ''
      })(),
      card_date: fd.get('date') || null,
      card_time: fd.get('time') || null,
      card_type: ct === 'todo' ? 'todo' : ct,
      price: 0,
      is_gcal: hasAddr,
      is_todo: ct === 'todo',
      position: (() => { const cc = cards.filter(c=>c.column_id===col.id); return cc.length ? Math.max(...cc.map(c=>c.position||0))+1 : 0 })(),
      note: '',
    }).select().single()
    if (card) {
      const cls = ct === 'todo' ? [] : getAutoChecklist(ct)
      for (const text of cls) {
        await supabase.from('checklist_items').insert({ card_id: card.id, text, done: false })
      }
      const staffIds = teamInits.map(init => getStaffByInit(init)?.id).filter(Boolean)
      if (staffIds.length) {
        await supabase.from('card_team').insert(staffIds.map(sid => ({ card_id: card.id, staff_id: sid })))
      }
      addLog('Karte erstellt: ' + fd.get('title'))
      // GCal sync if addr + date
      if (card.addr && card.card_date) {
        gcalSync(card, staffIds)
      }
    }
    setModal(null)
    loadCards()
  }

  async function createCol(fd) {
    await supabase.from('columns').insert({ title: fd.get('name'), dot_color: newColColor, position: cols.length, board_id: activeBoardId || null })
    addLog('Spalte: ' + fd.get('name'))
    setModal(null)
    loadCols()
  }

  async function renameCol(colId, title) {
    const col = cols.find(c => c.id === colId)
    setEditColModal({ id: colId, title, dot_color: col?.dot_color || '#6b6b6e' })
  }

  async function deleteColConfirmed(colId) {
    for (const c of cards.filter(x => x.column_id === colId)) {
      await supabase.from('card_team').delete().eq('card_id', c.id)
      await supabase.from('checklist_items').delete().eq('card_id', c.id)
      await supabase.from('cards').delete().eq('id', c.id)
    }
    await supabase.from('columns').delete().eq('id', colId)
    loadCols()
    broadcastChange('cols_changed'); loadCards()
  }

  async function saveClient(fd) {
    if (demoBlock()) return
    const spRaw = fd.get('service_prices_json')
    const spData = spRaw ? JSON.parse(spRaw) : null
    const data = {
      name: fd.get('name'), short_name: fd.get('short_name') || '',
      kundennr: fd.get('kundennr') || '',
      addr: fd.get('addr') || '', email: fd.get('email') || '', tel: fd.get('tel') || '',
      vat: fd.get('vat') || '', category: fd.get('cat') || 'Maklerunternehmen',
      extra_link: fd.get('extra_link') || null,
      color: fd.get('client_color') || null,
      contact_name: '', contact_email: '', contact_tel: '',
      contact_firstname: fd.get('contact_firstname') || '',
      contact_lastname: fd.get('contact_lastname') || '',
      contact_tel2: fd.get('contact_tel2') || '',
      dropbox_link: fd.get('dropbox_link') || '',
      service_prices: spData,
    }
    if (editClient?.id) await supabase.from('clients').update(data).eq('id', editClient.id)
    else {
      if (!data.kundennr) { try { const { data: kn } = await supabase.rpc('peek_kundennr'); if (kn) data.kundennr = kn } catch {} }
      await supabase.from('clients').insert(data)
    }
    addLog('Kunde: ' + data.name)
    setModal(null); setEditClient(null); loadClients()
    broadcastChange('clients_changed')
  }

  async function deleteClientFn(id) {
    if (demoBlock()) return
    if (!confirm('Wirklich löschen?')) return
    await supabase.from('clients').delete().eq('id', id)
    setModal(null); setEditClient(null); loadClients()
  }
  function findClientDuplicates() {
    // normalizált név: kisbetű, ékezet/írásjel/szóköz nélkül, jogi forma levágva
    const normN = s => String(s || '').toLowerCase()
      .replace(/\b(gmbh|gbr|ohg|kg|ag|e\.?k\.?|ug|co|mbh|immobilien|immobilen|makler)\b/g, '')
      .replace(/herr|frau|dr\.?/g, '')
      .replace(/[^a-z0-9]/g, '')
    const groups = {}
    for (const c of clients) {
      const k = normN(c.name)
      if (k.length < 3) continue
      ;(groups[k] = groups[k] || []).push(c)
    }
    const dups = Object.values(groups).filter(g => g.length > 1)
    setClientDupGroups(dups)
    setClientDupModal(true)
  }
  async function deleteClientsBulk(ids) {
    if (demoBlock()) return
    if (!ids.length) return
    if (!confirm(ids.length + ' Kunde(n) wirklich löschen? Zugeordnete Aufnahmen/Rechnungen bleiben erhalten.')) return
    let del = 0, blocked = 0
    try {
      await supabase.from('client_maklers').delete().in('client_id', ids)
      for (const id of ids) {
        const { data, error } = await supabase.from('clients').delete().eq('id', id).select('id')
        if (error || !data || !data.length) blocked++; else del++
      }
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setSelClients(new Set()); loadClients()
    if (blocked) alert('✓ ' + del + ' gelöscht. ' + blocked + ' nicht löschbar (evtl. mit Rechnungen verknüpft).')
  }

  function getVisClients() {
    const q = clientSearch.trim().toLowerCase()
    return q ? clients.filter(cl => [cl.name, cl.short_name, cl.addr, cl.email, cl.tel, cl.category].concat((maklers[cl.id] || []).map(m => m.name)).some(v => (v || '').toLowerCase().includes(q))) : clients
  }
  async function saveStaffFn(fd) {
    if (demoBlock()) return
    const data = {
      name: fd.get('name'),
      init: fd.get('init') || (fd.get('name') || '?').slice(0, 2).toUpperCase(),
      role: fd.get('role') || '',
      email: fd.get('email') || '',
      tel: fd.get('tel') || '',
      cal_id: fd.get('cal') || '',
      color: editStaff?._color || editStaff?.color || '#6b6b6e',
      avatar_url: staffAvatarData || editStaff?.avatar_url || null,
      address: fd.get('address') || null,
      birthday: fd.get('birthday') || null,
    }
    if (me?.role_level==='admin' && fd.get('role_level') && editStaff?.id !== me?.id) { data.role_level = fd.get('role_level') }
    if (me?.role_level==='admin') { data.can_invoice = fd.get('can_invoice') === 'on' }
    // board hozzáférés (csak admin szerkesztheti)
    if (me?.role_level==='admin' && editStaff?._allowed_boards !== undefined) {
      data.allowed_boards = editStaff._allowed_boards
    }
    const pw = (fd.get('password') || '').trim()
    if (editStaff?.id) {
      await supabase.from('staff').update(data).eq('id', editStaff.id)
      if (pw) {
        await fetch('/api/staff/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email, password: pw }) })
      }
    } else {
      await supabase.from('staff').insert(data)
      if (pw && data.email) {
        await fetch('/api/staff/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email, password: pw }) })
      }
    }
    addLog('Mitarbeiter: ' + data.name)
    setModal(null); setEditStaff(null); setStaffAvatarData(null); loadStaff()
    broadcastChange('staff_changed')
  }

  async function deleteStaffFn(id) {
    if (!confirm('Wirklich löschen?')) return
    await supabase.from('staff').delete().eq('id', id)
    setModal(null); setEditStaff(null); loadStaff()
  }

  function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = ev => { setStaffAvatarData(ev.target.result); setShowCrop(true) }
    r.readAsDataURL(file)
  }

  function exportClients() {
    const rows = [['Firmenname', 'Kürzel', 'Adresse', 'E-Mail', 'Telefon', 'USt-ID', 'Kategorie', 'Makler Name', 'Makler E-Mail', 'Makler Tel']]
    clients.forEach(c => {
      const cms = maklers[c.id] || []
      if (cms.length === 0) {
        // Ügyfél maklérek nélkül - egy sor
        rows.push([c.name, c.short_name || '', c.addr || '', c.email || '', c.tel || '', c.vat || '', c.category || '', '', '', ''])
      } else {
        // Minden maklernek külön sor, első sornál az ügyfél adatai, többinél üres
        cms.forEach((m, i) => {
          rows.push([
            i === 0 ? c.name : '',
            i === 0 ? (c.short_name || '') : '',
            i === 0 ? (c.addr || '') : '',
            i === 0 ? (c.email || '') : '',
            i === 0 ? (c.tel || '') : '',
            i === 0 ? (c.vat || '') : '',
            i === 0 ? (c.category || '') : '',
            m.name || '',
            m.email || '',
            m.tel || '',
          ])
        })
      }
    })
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'kunden_export.csv'
    a.click()
  }

  function importClients(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = async ev => {
      const lines = ev.target.result.split('\n').slice(1)
      for (const line of lines) {
        const cols2 = line.split(',').map(x => x.replace(/^"|"$/g, '').replace(/""/g, '"'))
        const [name, short_name, addr, email, tel, vat, category, cname, cemail, ctel] = cols2
        if (!name?.trim()) continue
        await supabase.from('clients').insert({ name: name.trim(), short_name: short_name || '', addr, email, tel, vat, category: category || 'Maklerunternehmen', contact_name: cname || '', contact_email: cemail || '', contact_tel: ctel || '' })
      }
      addLog('Kunden importiert')
      loadClients()
    }
    r.readAsText(file)
  }

  function getStats() {
    const n = new Date()
    const wk = new Date(n); wk.setDate(n.getDate() - n.getDay())
    const mo = new Date(n.getFullYear(), n.getMonth(), 1)
    const yr = new Date(n.getFullYear(), 0, 1)
    const gc = cards.filter(c => c.is_gcal && c.card_date)
    return {
      week: gc.filter(c => new Date(c.card_date) >= wk).length,
      month: gc.filter(c => new Date(c.card_date) >= mo).length,
      year: gc.filter(c => new Date(c.card_date) >= yr).length,
    }
  }

  async function sendShooting() {
    if (!sendModal) return
    const me = getMe()
    const templates = [
      'Hallo Zusammen,\n\nAnbei die fertigen Fotos zu ' + (sendModal.card.title) + ' 🏡\n\n' + sendModal.link + '\n\nBei Fragen stehe ich gerne zur Verfügung.\n\nViele Grüße,\n' + (me?.name || 'ImmoPixels'),
      'Hallo,\n\ndie Aufnahmen von ' + (sendModal.card.title) + ' sind fertig und stehen zum Download bereit:\n\n' + sendModal.link + '\n\nMit freundlichen Grüßen,\n' + (me?.name || 'ImmoPixels'),
      'Hallo,\n\nIhre Immobilienfotos sind fertig! 📸\n\n' + sendModal.link + '\n\nIch wünsche Ihnen viel Erfolg beim Verkauf!\n\n' + (me?.name || 'ImmoPixels'),
    ]
    const body = templates[sendModal.template - 1] || templates[0]
    const subj = 'Immobilienfotos - ' + sendModal.card.title
    window.open('mailto:' + sendModal.clientEmail + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body))
    const card = sendModal.card
    const sent = (card.checklist_items || []).find(ci => ci.text === 'Rausgeschickt')
    if (sent) await supabase.from('checklist_items').update({ done: true }).eq('id', sent.id)
    else await supabase.from('checklist_items').insert({ card_id: card.id, text: 'Rausgeschickt', done: true })
    addLog('Gesendet: ' + card.title + ' → ' + sendModal.clientEmail)
    setSendModal(null)
    loadCards()
  }

  function openSend(card) {
    const cl = clients.find(c => c.name === card.client_name || c.short_name === card.client_name)
    const emails = []
    if (cl?.contact_email) emails.push({ label: (cl.contact_name || cl.name || 'Kontakt'), email: cl.contact_email })
    if (cl?.email && cl.email !== cl?.contact_email) emails.push({ label: cl.name || 'Firma', email: cl.email })
    const cms = cl ? (maklers[cl.id] || []) : []
    for (const m of cms) {
      if (m.email) emails.push({ label: m.name || 'Makler', email: m.email })
    }
    const firstEmail = emails.length > 0 ? emails[0].email : ''
    setSendModal({ card, clientEmail: firstEmail, emailOptions: emails, link: card.drive_link || '', template: 1 })
  }


  async function sendAI() {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim()
    setAiInput('')
    setAiLoading(true)

    const newMessages = [...aiMessages, { role:'user', content:userMsg }]
    setAiMessages(prev => [...prev, { role:'user', content:userMsg }])
    setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior:'smooth' }), 50)

    // Build context
    const today = new Date().toISOString().slice(0,10)
    const upcomingCards = cards.filter(c=>c.card_date>=today&&!c.is_todo).slice(0,10)
    const statsData = getStats()
    const upcomingStr = upcomingCards.map(function(card) {
      return '- ' + card.card_date + ' ' + (card.card_time||'') + ' | ' + card.title + ' | ' + (card.addr||'') + ' | ' + (card.client_name||'')
    }).join('\n')
    const colsStr = cols.map(function(col) {
      return '- ' + col.title + ': ' + cards.filter(function(ca){ return ca.column_id === col.id }).length + ' kartya'
    }).join('\n')
    const staffStr = staff.map(function(s){ return s.name }).join(', ')
    const clientStr = clients.map(function(cl){ return cl.name }).join(', ')
    const context = 'Te az ImmoPixels CRM AI asszisztense vagy. Deutsch nyelvu, tomor valaszokat adsz.\n\n' +
      'AKTUELLE DATEN:\n' +
      'Heute: ' + today + '\n' +
      'Aufnahmen diese Woche: ' + statsData.week + ', honapi: ' + statsData.month + ', evi: ' + statsData.year + '\n' +
      'Gesamt Karten: ' + cards.length + '\n' +
      'Mitarbeiter: ' + staffStr + '\n' +
      'Kunden: ' + clientStr + '\n\n' +
      'KOMMENDE AUFNAHMEN:\n' + upcomingStr + '\n\n' +
      'SPALTEN:\n' + colsStr + '\n'

        try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: context,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await resp.json()

      if (data.error) {
        setAiMessages(prev => [...prev, { role:'assistant', content:'Fehler: ' + data.error }])
        setAiLoading(false)
        return
      }

      // Handle tool use
      const toolUses = (data.content || []).filter(b => b.type === 'tool_use')
      const textBlocks = (data.content || []).filter(b => b.type === 'text')
      const replyText = textBlocks.map(b => b.text).join('\n')

      if (toolUses.length > 0) {
        // Execute tools
        const toolResults = []
        for (const tool of toolUses) {
          let result = ''
          try {
            if (tool.name === 'create_card') {
              const inp = tool.input
              // Find column
              const col = cols.find(col => col.title.toLowerCase().includes((inp.column_title||'shootings').toLowerCase())) || cols[0]
              if (!col) { result = 'Fehler: Spalte nicht gefunden'; continue }
              const { data: card } = await supabase.from('cards').insert({
                column_id: col.id, title: inp.title,
                addr: inp.addr||'', description: inp.description||'',
                client_name: inp.client_name||'',
                card_date: inp.card_date||null, card_time: inp.card_time||null,
                card_type: inp.card_type||'foto', position: 999, note: '',
              }).select().single()
              if (card) {
                // Auto checklist
                for (const text of getAutoChecklist(inp.card_type||'foto')) {
                  await supabase.from('checklist_items').insert({ card_id: card.id, text, done: false })
                }
                addLog('AI erstellte Karte: ' + inp.title)
                loadCards()
                result = 'Karte "' + inp.title + '" wurde in "' + col.title + '" erstellt.'
              }
            } else if (tool.name === 'move_card') {
              const inp = tool.input
              const card = cards.find(c => c.title.toLowerCase().includes(inp.card_title.toLowerCase()))
              const col = cols.find(col => col.title.toLowerCase().includes(inp.column_title.toLowerCase()))
              if (!card) { result = 'Karte nicht gefunden: ' + inp.card_title; continue }
              if (!col) { result = 'Spalte nicht gefunden: ' + inp.column_title; continue }
              await supabase.from('cards').update({ column_id: col.id, updated_at: new Date().toISOString() }).eq('id', card.id)
              addLog('AI verschob Karte: ' + card.title)
              loadCards()
              result = 'Karte "' + card.title + '" wurde nach "' + col.title + '" verschoben.'
            } else if (tool.name === 'list_cards') {
              const inp = tool.input
              let filtered = cards.filter(c => !c.is_todo)
              if (inp.date) filtered = filtered.filter(c => c.card_date === inp.date)
              if (inp.column_title) {
                const col = cols.find(col => col.title.toLowerCase().includes(inp.column_title.toLowerCase()))
                if (col) filtered = filtered.filter(c => c.column_id === col.id)
              }
              result = filtered.length === 0 ? 'Keine Karten gefunden.' :
                filtered.map(c => c.title + (c.card_date ? ' (' + c.card_date + (c.card_time?' '+c.card_time.slice(0,5):'') + ')' : '')).join('\n')
            } else if (tool.name === 'delete_cards_in_column') {
              const inp = tool.input
              const col = cols.find(c => c.title.toLowerCase().includes(inp.column_title.toLowerCase()))
              if (!col) { result = 'Spalte nicht gefunden: ' + inp.column_title; continue }
              let toDelete = cards.filter(c => c.column_id === col.id)
              if (inp.is_gcal_only) toDelete = toDelete.filter(c => c.is_gcal)
              const ids = toDelete.map(c => c.id)
              if (ids.length === 0) { result = 'Keine Karten zum Löschen gefunden.'; continue }
              await supabase.from('card_team').delete().in('card_id', ids)
              await supabase.from('checklist_items').delete().in('card_id', ids)
              await supabase.from('comments').delete().in('card_id', ids)
              await supabase.from('cards').delete().in('id', ids)
              addLog('AI löschte ' + ids.length + ' Karten aus "' + col.title + '"')
              loadCards()
              result = ids.length + ' Karten aus "' + col.title + '" wurden gelöscht.'
            } else if (tool.name === 'find_duplicates') {
              const inp = tool.input
              let filtered = [...cards]
              if (inp.column_title) {
                const col = cols.find(c => c.title.toLowerCase().includes(inp.column_title.toLowerCase()))
                if (col) filtered = filtered.filter(c => c.column_id === col.id)
              }
              // Find duplicates by same title+date or same addr+date
              const seen = {}
              const dups = []
              for (const c of filtered) {
                const key = (c.card_date||'') + '_' + (c.addr||c.title||'').toLowerCase().trim()
                if (seen[key]) { dups.push(c) }
                else seen[key] = c
              }
              if (dups.length === 0) { result = 'Keine Duplikate gefunden.'; continue }
              if (inp.delete) {
                const ids = dups.map(c => c.id)
                await supabase.from('card_team').delete().in('card_id', ids)
                await supabase.from('checklist_items').delete().in('card_id', ids)
                await supabase.from('cards').delete().in('id', ids)
                addLog('AI löschte ' + ids.length + ' Duplikate')
                loadCards()
                result = ids.length + ' Duplikate wurden gelöscht.'
              } else {
                result = dups.length + ' Duplikate gefunden:\n' + dups.map(c => '- ' + c.title + (c.card_date?' ('+c.card_date+')':'')).join('\n') + '\nSoll ich sie löschen? Antworte mit "Ja, lösche die Duplikate".'
              }
            }
          } catch(e) {
            result = 'Fehler: ' + e.message
          }
          toolResults.push({ type:'tool_result', tool_use_id: tool.id, content: result })
        }

        // Send tool results back to get final response
        const followUp = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: context,
            messages: [
              ...newMessages.map(m => ({ role: m.role, content: m.content })),
              { role: 'assistant', content: data.content },
              { role: 'user', content: toolResults },
            ]
          })
        })
        const followData = await followUp.json()
        const finalText = (followData.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n')
        setAiMessages(prev => [...prev, { role:'assistant', content:finalText || replyText || 'Erledigt!' }])
      } else {
        setAiMessages(prev => [...prev, { role:'assistant', content:replyText || 'Keine Antwort.' }])
      }
    } catch(e) {
      const errMsg = e?.message || 'Unbekannter Fehler'
      setAiMessages(prev => [...prev, { role:'assistant', content:'Fehler: ' + errMsg }])
    }
    setAiLoading(false)
    setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  async function syncGcal() {
    setSyncTxt('...')
    try {
      const res = await fetch('/api/gcal/sync', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (j.ok) {
        const summary = `✓ ${j.created || 0}+ ${j.updated || 0}~ ${j.deleted || 0}-`
        setSyncTxt(summary)
        await loadCards(); await loadCols()
      } else {
        setSyncTxt('Fehler')
        console.error('GCal sync error:', j)
      }
    } catch(e) {
      setSyncTxt('Fehler')
      console.error('GCal sync exception:', e)
    }
    setTimeout(() => setSyncTxt('GCal'), 4000)
  }

  const stats = getStats()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
      <style>{`
        @keyframes ip-pulse{0%,100%{transform:scale(1);box-shadow:0 4px 20px rgba(184,137,42,.2)}50%{transform:scale(1.07);box-shadow:0 10px 36px rgba(184,137,42,.38)}}
        @keyframes ip-dot{0%,80%,100%{transform:scale(.45);opacity:.25}40%{transform:scale(1);opacity:1}}
        @keyframes ip-bar{0%{width:8%}60%{width:82%}100%{width:96%}}
        @keyframes ip-fade{0%,100%{opacity:.5}50%{opacity:1}}
      `}</style>
      <div style={{ width:68, height:68, borderRadius:20, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(184,137,42,.2)', animation:'ip-pulse 2s ease-in-out infinite', overflow:'hidden' }}>
        <img src={LOGO} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }} alt="ImmoPixels" />
      </div>
      <div style={{ animation:'ip-fade 2s ease-in-out infinite', textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--t1)', letterSpacing:'.3px' }}>ImmoPixels CRM</div>
        <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>Wird geladen...</div>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--gold)', animation:'ip-dot 1.4s ease-in-out 0s infinite' }} />
        <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--gold)', animation:'ip-dot 1.4s ease-in-out .2s infinite' }} />
        <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--gold)', animation:'ip-dot 1.4s ease-in-out .4s infinite' }} />
      </div>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'var(--bg3)' }}>
        <div style={{ height:'100%', background:'var(--gold)', borderRadius:'0 2px 2px 0', animation:'ip-bar 2.5s ease-out forwards' }} />
      </div>
    </div>
  )

  const calSrc = 'https://calendar.google.com/calendar/embed?' +
    calFilters.map(id => {
      const cal = CALS.find(c => c.id === id)
      return 'src=' + id + '&color=%23' + (cal ? cal.color.replace('#', '') : 'B27300')
    }).join('&') +
    '&ctz=Europe%2FBerlin&mode=' + calView + '&showTitle=0&showNav=1&showPrint=0&showTabs=0&showCalendars=0&bgcolor=%23f4f2ef'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }} className="main-layout">

      <style>{`
        :root {
          --font-size-base: ${{ sm:'13px', md:'14px', lg:'16px' }[fontSize] || '14px'};
          --card-padding: ${{ compact:'7px 8px', standard:'9px 10px', large:'12px 13px' }[cardSize] || '9px 10px'};
          --card-title-size: ${{ compact:'11px', standard:'12px', large:'14px' }[cardSize] || '12px'};
          --bg: ${{ linen:'#f4f2ef', bluegray:'#f0f4f8', sand:'#f5f0eb', sage:'#eef4ee', lavender:'#f8f0f5', dark:'#1c1a16', white:'#ffffff' }[bgColor] || '#f4f2ef'};
          --bg2: ${bgColor === 'dark' ? '#2a2820' : '#ffffff'};
          --bg3: ${bgColor === 'dark' ? '#333028' : '#eeebe6'};
          --t1: ${bgColor === 'dark' ? '#f4f2ef' : '#1c1a16'};
          --t2: ${bgColor === 'dark' ? '#c8c4bc' : '#4a4640'};
          --t3: ${bgColor === 'dark' ? '#8a8278' : '#8a8278'};
          --border: ${bgColor === 'dark' ? '#444038' : '#ddd9d2'};
        }
        body { font-size: var(--font-size-base) !important; }
        .board-card { padding: var(--card-padding) !important; }
        .drag-ghost { opacity: 0.2 !important; pointer-events: none !important; }
        .col-drag-ghost { opacity: 0.15 !important; }
        .card-title-main { font-size: var(--card-title-size) !important; }
      `}</style>
      {/* ── TOPBAR ── */}
      <div style={{ height: 52, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0, boxShadow: 'var(--sh)', zIndex: 100 }}>
        <div onClick={() => setTab('board')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderRight: '1px solid var(--border)', height: '100%', cursor: 'pointer' }}>
          <img src={LOGO} style={{ width: 30, height: 30, borderRadius: '50%' }} />
          <span className="topbar-logo-text" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>ImmoPixels</span>
          <div className="topbar-logo-text" style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>CRM</span>
        </div>
        {/* Desktop nav */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 4px' }}>
          {[
            { id: 'board', label: 'Board', icon: 'ti-layout-kanban' },
            { id: 'calendar', label: 'Kalender', icon: 'ti-calendar' },
      ...(isAdminOrSub ? [{ id: 'buchen', label: 'Buchungen', icon: 'ti-calendar-plus' }] : []),
            { id: 'clients', label: 'Kunden', icon: 'ti-users' },
            ...(!isDemo ? [{ id: 'phonebook', label: 'Telefonbuch', icon: 'ti-address-book' }] : []),
            { id: 'staff', label: 'Mitarbeiter', icon: 'ti-id-badge' },
            { id: 'fahrtenbuch', label: 'Fahrtenbuch', icon: 'ti-car' },
          ].map(tb => (
            <div key={tb.id} onClick={() => { setTab(tb.id); if(tb.id==='amelia') setAmeliaPending(0) }}
              style={{ padding: '0 11px', height: '100%', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: tab === tb.id ? 'var(--gold)' : 'var(--t3)', cursor: 'pointer', borderBottom: tab === tb.id ? '2px solid var(--gold)' : '2px solid transparent', transition: 'color .15s, background .15s', position:'relative' }}
              onMouseEnter={e => { if(tab!==tb.id){e.currentTarget.style.color='var(--gold)';e.currentTarget.style.background='rgba(184,137,42,.05)'} const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='scale(1.18) rotate(-6deg)' }}
              onMouseLeave={e => { if(tab!==tb.id){e.currentTarget.style.color='var(--t3)';e.currentTarget.style.background='none'} const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='none' }}>
              <i className={'ti ' + tb.icon} style={{ fontSize: 13, transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)' }}></i>
              {tb.label}
              {tb.id==='amelia' && ameliaPending > 0 && (
                <span style={{ position:'absolute', top:8, right:4, width:8, height:8, borderRadius:'50%', background:'#b91c1c', border:'1.5px solid var(--bg)' }} />
              )}
            </div>
          ))}
          {me?.can_invoice && (
            <div onClick={() => { window.location.href = '/kunden' }}
              style={{ padding: '0 11px', height: '100%', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--t3)', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'color .15s, background .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color='var(--gold)'; e.currentTarget.style.background='var(--gdbg)'; const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='scale(1.18)' }}
              onMouseLeave={e => { e.currentTarget.style.color='var(--t3)'; e.currentTarget.style.background='none'; const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='none' }}>
              <i className="ti ti-users" style={{ fontSize: 13, transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)' }}></i>
              Kunden
            </div>
          )}
          {me?.can_invoice && (
            <div onClick={() => { window.location.href = '/rechnungen' }}
              style={{ padding: '0 11px', height: '100%', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--t3)', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'color .15s, background .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color='var(--gold)'; e.currentTarget.style.background='rgba(184,137,42,.05)'; const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='scale(1.18) rotate(-6deg)' }}
              onMouseLeave={e => { e.currentTarget.style.color='var(--t3)'; e.currentTarget.style.background='none'; const ic=e.currentTarget.querySelector('i'); if(ic) ic.style.transform='none' }}>
              <i className="ti ti-file-invoice" style={{ fontSize: 13, transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)' }}></i>
              Rechnungen
            </div>
          )}
          <div onClick={() => setShowWidgets(p => !p)} style={{ padding: '0 13px', height: '100%', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: showWidgets ? 'var(--gold)' : 'var(--t3)', cursor: 'pointer', borderBottom: showWidgets ? '2px solid var(--gold)' : '2px solid transparent' }}>
            <i className="ti ti-layout-grid" style={{ fontSize:14 }}></i> Widgets
          </div>

        </div>
        {/* Mobil hamburger gomb */}
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(p=>!p)}
          style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'0 10px', color:'var(--t2)', marginLeft:4 }}>
          <i className={'ti ' + (mobileMenuOpen ? 'ti-x' : 'ti-menu-2')} style={{ fontSize:20 }}></i>
        </button>
        {/* Mobil drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer" style={{ position:'fixed', top:52, left:0, right:0, background:'var(--bg2)', borderBottom:'1px solid var(--border)', zIndex:300, padding:'8px 0', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}
            onClick={() => setMobileMenuOpen(false)}>
            {[
              { id:'board', label:'Board', icon:'ti-layout-kanban' },
              { id:'calendar', label:'Kalender', icon:'ti-calendar' },
              ...(isAdminOrSub ? [{ id:'buchen', label:'Buchungen', icon:'ti-calendar-plus' }] : []),
              { id:'clients', label:'Kunden', icon:'ti-users' },
              { id:'staff', label:'Mitarbeiter', icon:'ti-id-badge' },
              ...(!isDemo ? [{ id:'phonebook', label:'Telefonbuch', icon:'ti-address-book' }] : []),
            ].map(tb => (
              <div key={tb.id} onClick={() => { setTab(tb.id); setMobileMenuOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', fontSize:14, fontWeight:600, color: tab===tb.id ? 'var(--gold)' : 'var(--t1)', background: tab===tb.id ? 'var(--gdbg)' : 'none', borderLeft: tab===tb.id ? '3px solid var(--gold)' : '3px solid transparent', cursor:'pointer' }}>
                <i className={'ti '+tb.icon} style={{ fontSize:16 }}></i>
                {tb.label}
              </div>
            ))}
            {me?.can_invoice && (
              <div onClick={() => { window.location.href = '/rechnungen' }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', fontSize:14, fontWeight:600, color:'var(--t1)', cursor:'pointer' }}>
                <i className="ti ti-file-invoice" style={{ fontSize:16 }}></i> Rechnungen
              </div>
            )}
            <div onClick={() => { setShowWidgets(p=>!p); setMobileMenuOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', fontSize:14, fontWeight:600, color: showWidgets ? 'var(--gold)' : 'var(--t1)', cursor:'pointer' }}>
              <i className="ti ti-layout-grid" style={{ fontSize:16 }}></i> Widgets
            </div>
            <div onClick={() => { setAiOpen(p=>!p); setMobileMenuOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', fontSize:14, fontWeight:600, color: aiOpen ? 'var(--gold)' : 'var(--t1)', cursor:'pointer' }}>
              <ClaudeAvatar size={20} /> Claude
            </div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
          {(me?.role_level === 'admin') && <div className="mobile-hide" onClick={() => setShowDebug(p => !p)} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:showDebug?'var(--gdbg)':'var(--bg3)', border:'0.5px solid '+(showDebug?'var(--gold)':'var(--border)'), borderRadius:6, color:showDebug?'var(--gold)':'var(--t3)', cursor:'pointer' }} title='Debug'><i className='ti ti-bug' style={{fontSize:14}}></i></div>}
          <a className="mobile-hide" href="https://webmail.alfahosting.de" target="_blank" rel="noopener"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:unreadEmail>0?'#fff3e0':'var(--bg3)', border:'0.5px solid '+(unreadEmail>0?'#f97316':'var(--border)'), borderRadius:6, color:unreadEmail>0?'#f97316':'var(--t3)', textDecoration:'none', position:'relative' }} title={'E-Mail: '+unreadEmail+' ungelesen'}>
            <i className='ti ti-mail' style={{fontSize:14}}></i>
            {unreadEmail > 0 && <span style={{ position:'absolute', top:-4, right:-4, background:'#f97316', color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, minWidth:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{unreadEmail > 99 ? '99+' : unreadEmail}</span>}
          </a>
          <button className="mobile-hide" onClick={()=>setShowTutorial(true)} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, color:'var(--t3)', cursor:'pointer' }} title='Tutorial'>
            <i className='ti ti-help' style={{fontSize:14}}></i>
          </button>
          <a className="mobile-hide" href="/settings" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, color:'var(--t3)', textDecoration:'none' }} title='Einstellungen'><i className='ti ti-settings' style={{fontSize:14}}></i></a>
          {me?.role_level === 'admin' && (
            <a className="mobile-hide" href="/stats" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, color:'var(--t3)', textDecoration:'none' }} title='Statistik'><i className='ti ti-chart-bar' style={{fontSize:14}}></i></a>
          )}
          {process.env.NEXT_PUBLIC_IS_DEMO === '1' && <div className="mobile-hide" style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6b6b6e', borderRadius: 5, padding: '3px 8px', letterSpacing: '.5px' }}>DEMO</div>}
          <div className="mobile-hide" style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontFamily: 'monospace' }}>{version}</div>

          <button className="mobile-only" onClick={()=>setChatOpen(p=>!p)} style={{ display:'none', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, color:'var(--t3)', cursor:'pointer', position:'relative' }}>
            <i className='ti ti-message-circle' style={{fontSize:14}}></i>
            {unreadChat>0 && <span style={{ position:'absolute', top:-3, right:-3, background:'#b91c1c', color:'#fff', fontSize:8, fontWeight:700, borderRadius:10, minWidth:12, height:12, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>{unreadChat}</span>}
          </button>
          <button className="mobile-only" onClick={()=>{setChatOpen(true); setTimeout(()=>document.querySelector('.claude-input')?.focus(),100)}} style={{ display:'none', alignItems:'center', justifyContent:'center', width:28, height:28, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, color:'var(--t3)', cursor:'pointer' }}>
            <ClaudeAvatar size={14} />
          </button>
          <div className="mobile-hide" onClick={syncGcal} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--grbg)', border: '0.5px solid var(--grbr)', borderRadius: 16, padding: '4px 11px', fontSize: 11, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            {syncTxt}
          </div>
          <div style={{ position: 'relative', display:'flex', alignItems:'center' }}>
              <NotificationBell count={notifications.filter(n=>!n.read).length} onClick={() => setShowNotifDropdown(p=>!p)} supabase={supabase} currentStaff={me} />
              {showNotifDropdown && (
                <>
                  <div onClick={()=>setShowNotifDropdown(false)} style={{ position:'fixed', inset:0, zIndex:490 }} />
                  <NotificationDropdown notifications={notifications} staff={staff}
                    onRead={openCardFromNotification}
                    onReadAll={async () => { await supabase.from('notifications').update({read:true}).eq('recipient_id',me?.id); loadNotifications() }}
                    onClose={() => setShowNotifDropdown(false)} />
                </>
              )}
            </div>
          <div style={{ position: 'relative' }}>
            <div onClick={e => { e.stopPropagation(); setShowProfile(p => !p) }} style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#9a9a9d,#8a5e20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', border: '2px solid var(--border)' }}>
              {me?.avatar_url
                ? <img src={me.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{me?.init || 'CD'}</span>}
            </div>
            {showProfile && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', right: 16, top: 58, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 11, width: 248, boxShadow: '0 8px 32px rgba(0,0,0,.15)', zIndex: 501, overflow:'hidden' }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:(me?.color||'#6b6b6e')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:me?.color||'#6b6b6e', flexShrink:0, border:'2px solid '+(me?.color||'#6b6b6e'), position:'relative' }}>
                    {me?.avatar_url ? <img src={me.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span>{me?.init||'?'}</span>}
                    <div style={{ position:'absolute', bottom:-1, right:-1, width:9, height:9, borderRadius:'50%', background:activeSession?'#15803d':'#8a8278', border:'1.5px solid var(--bg2)' }} />
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{me?.name||'?'}</div>
                    <div style={{ fontSize:10, color:'var(--t3)' }}>{activeSession ? '● Eingecheckt seit '+new Date(activeSession.check_in).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '○ Nicht eingecheckt'}</div>
                  </div>
                </div>

                {/* Check-in/out */}
                <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                  {activeSession ? (
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontSize:11, color:'var(--t2)' }}>Arbeitszeit</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'#6b6b6e' }}>{getSessionDuration(activeSession)}</span>
                      </div>
                      <button onClick={()=>{ const n=prompt('Notiz (optional):',''); doCheckOut(n); setShowProfile(false) }}
                        style={{ width:'100%', background:'#b91c1c', color:'#fff', border:'none', borderRadius:7, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        <i className="ti ti-clock-stop" style={{fontSize:13}} /> Check-out
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>{ doCheckIn(); setShowProfile(false) }}
                      style={{ width:'100%', background:'#15803d', color:'#fff', border:'none', borderRadius:7, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <i className="ti ti-clock-play" style={{fontSize:13}} /> Check-in
                    </button>
                  )}
                </div>

                {/* Team today */}
                {teamSessions.filter(s=>s.staff_id!==me?.id).length > 0 && (
                  <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>Team heute</div>
                    {(()=>{
                      const seen = new Set()
                      return teamSessions.filter(s=>{ if(s.staff_id===me?.id||seen.has(s.staff_id)) return false; seen.add(s.staff_id); return true }).slice(0,4).map(s=>(
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', overflow:'hidden', background:(s.staff?.color||'#888')+'22', color:s.staff?.color||'#888', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:'1.5px solid '+(s.staff?.color||'#888'), flexShrink:0 }}>
                            {s.staff?.avatar_url ? <img src={s.staff.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (s.staff?.init||'?')}
                          </div>
                          <div style={{ flex:1, fontSize:11, color:'var(--t2)' }}>{s.staff?.name||'?'}</div>
                          <div style={{ width:7, height:7, borderRadius:'50%', background: s.check_out?'#8a8278':'#15803d', flexShrink:0 }} />
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {/* Nav links */}
                <div style={{ padding:'8px 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  <a href="/profil" onClick={()=>setShowProfile(false)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 8px', borderRadius:6, fontSize:12, color:'var(--t2)', textDecoration:'none', background:'none' }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <i className="ti ti-user" style={{fontSize:13}} /> Mein Bereich
                  </a>
                  <a href="/settings" onClick={()=>setShowProfile(false)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 8px', borderRadius:6, fontSize:12, color:'var(--t2)', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <i className="ti ti-settings" style={{fontSize:13}} /> Einstellungen
                  </a>
                  <button onClick={()=>{ setShowProfile(false); supabase.auth.signOut() }} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 8px', borderRadius:6, fontSize:12, color:'var(--red)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left' }} onMouseEnter={e=>e.currentTarget.style.background='var(--rdbg)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <i className="ti ti-door-exit" style={{fontSize:13}} /> Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VERSION UPDATE BANNER ── */}
      {newVersionAvail && (
        <div style={{ background: 'var(--gold)', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap:10, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          <span>🔄 Neue Version verfügbar!</span>
          <button onClick={() => window.location.reload()} style={{ background: 'rgba(255,255,255,.25)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Jetzt aktualisieren</button>
          <button onClick={() => setNewVersionAvail(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── DEBUG PANEL ── */}
      {showDebug && (
        <div style={{ position: 'fixed', top: 52, right: 0, width: 400, height: 'calc(100vh - 52px)', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--sh2)', zIndex: 150, display: 'flex', flexDirection: 'column', fontFamily: 'monospace', fontSize: 11 }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>🔍 Debug — {debugLog.length} Ereignisse</span>
            <button onClick={() => setShowDebug(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--t3)' }}>✕</button>
          </div>
          <DebugPanel supabase={supabase} localLog={debugLog}  me={me} />
        </div>
      )}

      {/* ── BOARD ── */}
      {isDemo && (
        <div style={{ background:'#6b6b6e', color:'#fff', textAlign:'center', fontSize:12, fontWeight:700, padding:'6px', letterSpacing:'.3px', zIndex:999, flexShrink:0 }}>
          Demo-Modus — Nur Ansicht, keine Änderungen möglich
        </div>
      )}
      {tab === 'board' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="board-toolbar" style={{ height: 42, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', flexShrink: 0 }}>
            {(() => {
              if (boards.length === 0) return null
              // Ha még nem tudjuk a role-t, alapból mindent mutatunk (admin-biztos fallback)
              const isMarketing = myRow?.role_level === 'marketing'
              const visibleBoards = isMarketing
                ? boards.filter(b => b.slug === 'marketing')
                : boards
              if (visibleBoards.length === 0) {
                return <span style={{ fontSize: 12, color: 'var(--t3)' }}>Kein Board verfügbar</span>
              }
              if (visibleBoards.length === 1) {
                return <span style={{ fontSize: 13, fontWeight: 700 }}>{visibleBoards[0].name}</span>
              }
              return (
                <div style={{ display:'flex', gap:4, background:'var(--bg3)', borderRadius:7, padding:2 }}>
                  {visibleBoards.map(b => (
                    <button key={b.id} onClick={() => setActiveBoardId(b.id)}
                      style={{
                        padding:'4px 12px', borderRadius:5, border:'none',
                        background: activeBoardId===b.id ? (b.color||'var(--gold)') : 'transparent',
                        color: activeBoardId===b.id ? '#fff' : 'var(--t2)',
                        fontSize:12, fontWeight:700, cursor:'pointer',
                        transition:'background .12s'
                      }}>
                      {b.name}
                    </button>
                  ))}
                </div>
              )
            })()}
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
            <button onClick={() => { setNewCardColId(null); setModal('new-card') }} className='btn-primary-anim' style={{ ...BTNP, padding: '5px 11px', fontSize: 12, display:'flex', alignItems:'center', gap:5 }} onMouseEnter={e=>{const ic=e.currentTarget.querySelector('i');if(ic)ic.style.transform='rotate(90deg)'}} onMouseLeave={e=>{const ic=e.currentTarget.querySelector('i');if(ic)ic.style.transform='none'}}><i className="ti ti-plus" style={{ fontSize:12, transition:'transform .22s cubic-bezier(.34,1.56,.64,1)' }}></i> Neue Karte</button>
            <button onClick={() => setModal('new-col')} style={{ ...BTNG, padding: '5px 11px', fontSize: 12, display:'flex', alignItems:'center', gap:5, transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .15s,border-color .15s,color .15s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.08)';e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)';const ic=e.currentTarget.querySelector('i');if(ic)ic.style.transform='translateX(3px) scale(1.1)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='';e.currentTarget.style.color='';const ic=e.currentTarget.querySelector('i');if(ic)ic.style.transform='none'}}><i className="ti ti-columns" style={{ fontSize:12, transition:'transform .2s cubic-bezier(.34,1.56,.64,1)' }}></i> + Spalte</button>
            <button onClick={openGcalPicker} style={{ ...BTNG, padding: '5px 11px', fontSize: 12, display:'flex', alignItems:'center', gap:5 }}><i className="ti ti-brand-google" style={{ fontSize:12 }}></i> Aus Kalender</button>
            {me?.role_level === 'admin' && <button onClick={openDuplicates} style={{ ...BTNG, padding: '5px 11px', fontSize: 12, display:'flex', alignItems:'center', gap:5 }}><i className="ti ti-copy" style={{ fontSize:12 }}></i> Duplikate</button>}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 7, padding: '4px 10px', width: 260, transition: 'border-color .15s' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--t3)', flexShrink: 0 }} />
                <input
                  value={boardSearch}
                  onChange={e => setBoardSearch(e.target.value)}
                  placeholder="Karten, Kunden, Adressen…"
                  style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--t1)', outline: 'none', width: '100%', fontFamily: 'Arial' }}
                />
                {boardSearch && (
                  <span onClick={() => setBoardSearch('')} style={{ fontSize: 11, color: 'var(--t3)', cursor: 'pointer', flexShrink: 0 }}>✕</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['board', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{ background: view === v ? 'var(--gdbg)' : 'none', border: 'none', color: view === v ? 'var(--gold)' : 'var(--t3)', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  {v === 'board' ? '⊞ Board' : '☰ Liste'}
                </button>
              ))}
            </div>
          </div>

          {view === 'board' ? (
            <div className="bcol-board board-cols-wrap" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {(() => {
                const sortedCols = [...cols].sort((a,b) => (a.position||0)-(b.position||0))
                const colItems = []
                sortedCols.forEach((col, ci) => {
                  const isColDragged = isColDraggingRef.current && colDragRef.current?.id === col.id
                  colItems.push((() => {
                const colCards = cardsForCol(col.id)
                const isCollapsed = collapsedCols.includes(col.id)
                return (
                  <div key={col.id} className="bcol"
                    draggable={false}
                    style={{ width: isCollapsed ? 44 : 272, minWidth: isCollapsed ? 44 : 272, background: 'linear-gradient(' + getColStyle(col.color).bg + ',' + getColStyle(col.color).bg + '), #fff', border: '1px solid #e9e4db', borderRadius: 11, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 116px)', flexShrink: 0, transition: 'all .2s', cursor: isCollapsed ? 'pointer' : 'default', opacity: isColDragged ? 0.8 : 1, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
                    data-colid={col.id}
>
                    {isCollapsed ? (
                      <div onClick={() => setCollapsedCols(p => p.filter(x => x !== col.id))} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', cursor: 'pointer', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot_color }} />
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', flex: 1 }}>{col.title}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', background: 'var(--bg4)', borderRadius: 4, padding: '2px 5px' }}>{colCards.length}</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: colWidgetHeader?hexToGradient(col.dot_color||'#6b6b6e'):'#f6f4f0', borderRadius: colWidgetHeader?'10px 10px 0 0':'10px 10px 0 0', borderBottom: colWidgetHeader?'none':'1px solid #ece8e1' }}>
                          <div
                            onMouseDown={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              if(e.button !== 0) return
                              startColDrag(e, e.currentTarget.closest('.bcol'), col)
                            }}
                            onTouchStart={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              startColDrag(e, e.currentTarget.closest('.bcol'), col)
                            }}
                            style={{ cursor: 'grab', padding: '4px 4px', color: 'var(--t3)', display:'flex', alignItems:'center', touchAction:'none', userSelect:'none', WebkitUserSelect:'none' }}
                            title="Spalte verschieben">
                            <i className="ti ti-grip-vertical" style={{ fontSize:14 }}></i>
                          </div>
                          {!colWidgetHeader && <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot_color }} />}
                          <div style={{ fontSize: 12, fontWeight: 700, color: colWidgetHeader?'#fff':'var(--t1)', flex: 1 }}>{col.title}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: colWidgetHeader?'rgba(255,255,255,.9)':'var(--t3)', background: colWidgetHeader?'rgba(255,255,255,.2)':'var(--bg4)', borderRadius: 4, padding: '1px 5px' }}>{colCards.length}</div>
                          <button onClick={() => setCollapsedCols(p => [...p, col.id])} title="Einklappen" style={{ background: 'none', border: 'none', color: colWidgetHeader?'rgba(255,255,255,.8)':'var(--t3)', cursor: 'pointer', padding: '2px 3px', display:'flex', alignItems:'center' }}><i className="ti ti-chevron-left" style={{ fontSize:13 }}></i></button>
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setColSortMenu(m => m === col.id ? null : col.id)} title="Sortierung" style={{ background: 'none', border: 'none', color: colWidgetHeader?'rgba(255,255,255,.8)':'var(--t3)', cursor: 'pointer', padding: '2px 3px', display:'flex', alignItems:'center' }}><i className="ti ti-arrows-sort" style={{ fontSize:13 }}></i></button>
                            {colSortMenu === col.id && (
                              <>
                                <div onClick={() => setColSortMenu(null)} style={{ position:'fixed', inset:0, zIndex:399 }} />
                                <div style={{ position:'absolute', top:24, right:0, zIndex:400, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:9, boxShadow:'0 8px 28px rgba(0,0,0,.16)', minWidth:170, overflow:'hidden', padding:4 }}>
                                  {[['', 'Termin (Standard)', 'ti-calendar'], ['newest', 'Neueste zuerst', 'ti-sparkles'], ['manual', 'Manuell (Reihenfolge)', 'ti-grip-vertical']].map(([mode, label, ic]) => {
                                    const active = (colSort[col.id] || '') === mode
                                    return (
                                      <div key={mode||'std'} onClick={() => { setColSortFor(col.id, mode); setColSortMenu(null) }}
                                        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight: active?700:500, color: active?'#6b6b6e':'var(--t1)', background: active?'#6b6b6e14':'transparent' }}>
                                        <i className={'ti '+ic} style={{ fontSize:14 }}></i><span style={{ flex:1 }}>{label}</span>{active && <i className="ti ti-check" style={{ fontSize:13 }}></i>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                          <button onClick={() => renameCol(col.id, col.title)} title="Umbenennen" style={{ background: 'none', border: 'none', color: colWidgetHeader?'rgba(255,255,255,.8)':'var(--t3)', cursor: 'pointer', padding: '2px 3px', display:'flex', alignItems:'center' }}><i className="ti ti-pencil" style={{ fontSize:13 }}></i></button>
                          <button onClick={() => {
                            const colTitle = col.title || 'Spalte'
                            const cardCount = cards.filter(c => c.column_id === col.id).length
                            setConfirmDialog({
                              title: 'Spalte löschen?',
                              message: `<b>${colTitle}</b> wird dauerhaft gelöscht.${cardCount > 0 ? `<br><span style="color:#b91c1c">${cardCount} Karte${cardCount !== 1 ? 'n' : ''} werden ebenfalls entfernt.</span>` : ''}`,
                              confirmLabel: 'Löschen',
                              confirmColor: '#b91c1c',
                              icon: 'ti-trash',
                              iconBg: '#fef2f2',
                              iconColor: '#b91c1c',
                              onConfirm: async () => { setConfirmDialog(null); await deleteColConfirmed(col.id) },
                              onCancel: () => setConfirmDialog(null)
                            })
                          }} title="Löschen" style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: '2px 3px', display:'flex', alignItems:'center' }}><i className="ti ti-trash" style={{ fontSize:13 }}></i></button>
                        </div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
                        <div className="bcol-cards" data-colid={col.id} style={{ overflowY: 'auto', padding: '14px 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                          {(() => {
                            const items = []
                            const isDragCol = dragOverColId === col.id
                            const ccLimit = colCardLimit[col.id] || PAGE_SIZE
                            const allCC = boardSearch ? colCards.filter(c => { const q=boardSearch.toLowerCase(); return (c.title||'').toLowerCase().includes(q)||(c.addr||'').toLowerCase().includes(q)||(c.client_name||'').toLowerCase().includes(q)||(c.description||'').toLowerCase().includes(q)||(c.note||'').toLowerCase().includes(q) }) : colCards
                            const ccVisible = allCC.slice(0, ccLimit)
                            const ccMore = allCC.length > ccLimit
                            const dragIdx = isDragCol ? (dragOverIndex ?? ccVisible.length) : -1
                            let inserted = false
                            ccVisible.forEach((card, i) => {
                              if (isDragCol && !inserted && i === dragIdx) {
                                items.push(<div key="ph" style={{ height: 52, borderRadius: 9, background: 'rgba(184,137,42,.1)', border: '1.5px dashed #6b6b6e', flexShrink: 0, transition: 'height .2s' }} />)
                                inserted = true
                              }
                              if (dragging && card.id === dragging.id) return
                              items.push(
                                <CardItem key={card.id} card={card} compact={compactEnabled && compactCards.includes(card.id)}
                                onCompactToggle={compactEnabled ? () => { setCompactCards(prev => { const n = prev.includes(card.id) ? prev.filter(x=>x!==card.id) : [...prev,card.id]; localStorage.setItem('compactCards',JSON.stringify(n)); return n }) } : null}
                                staff={staff} onlineUsers={onlineUsers} fontSize={fontSize} dragging={dragging} clients={clients} border={cardBorder(card)} overdueDays={cardOverdueDays(card)} overdueBg={cardOverdueBg(card)} onNoteChange={onNoteChange} onNoteEnter={onNoteEnter} onClick={() => setActiveCard(card)} onDragStart={(e, cardEl) => startCustomDrag(e.clientX || e.touches?.[0]?.clientX, e.clientY || e.touches?.[0]?.clientY, cardEl, card)} onSend={openSend} droppedId={droppedCard}
                            onCheck={async (card) => {
                              const fertig = cols.find(c => c.title.toLowerCase().includes('fertig') || c.title.toLowerCase().includes('kész'))
                              if (fertig) { await supabase.from('cards').update({column_id:fertig.id,updated_at:new Date().toISOString()}).eq('id',card.id); loadCards(); addLog('Fertig: '+card.title) }
                            }}
                            onDelete={async (card) => {
                              const archCol = cols.find(c => c.title.trim().toLowerCase() === 'archiviert')
                              if (archCol && card.column_id === archCol.id) {
                                // Already in Archiviert → hard delete
                                setConfirmDialog({ title: 'Endgültig löschen?', message: '<b>' + (card.title||'') + '</b><br>Diese Aktion kann nicht rückgängig gemacht werden.', confirmLabel: 'Löschen', confirmColor: '#b91c1c', icon: 'ti-trash', iconBg: '#fecaca', iconColor: '#b91c1c',
                                  onConfirm: async () => { setConfirmDialog(null); await hardDeleteCard(card.id, card.title) },
                                  onCancel: () => setConfirmDialog(null) })
                              } else {
                                await deleteCard(card.id, card.title)
                              }
                            }}
                            onColorChange={async (card, color) => {
                              setCards(p => p.map(c => c.id === card.id ? {...c, card_color: color || null} : c))
                              await supabase.from('cards').update({ card_color: color || null }).eq('id', card.id) /* no updated_at */
                            }}
                            allTypes={getTypes(photoCats)} noteMention={noteMention}
                            hideNotSentBadge={(() => { const ct=(cols.find(c=>c.id===card.column_id)?.title||'').toLowerCase(); return ct.includes('fertig')||ct.includes('archiv')||ct.includes('terminier') })()}
                            setNoteMention={setNoteMention}
                            dirtyCards={dirtyCards}
                            editingCards={editingCards}
                                onMoveUp={card => moveCardInColumn(card, 'up')}
                            onMoveDown={card => moveCardInColumn(card, 'down')}
                          />
                              )
                            })
                            if (isDragCol && !inserted) {
                              items.push(<div key="ph-end" style={{ height: 52, borderRadius: 9, background: 'rgba(184,137,42,.1)', border: '1.5px dashed #6b6b6e', flexShrink: 0 }} />)
                            }
                            if (ccMore) {
                              items.push(
                                <button key="mehr" onClick={e=>{e.stopPropagation();setColCardLimit(prev=>({...prev,[col.id]:(prev[col.id]||PAGE_SIZE)+PAGE_SIZE}))}}
                                  style={{ width:'100%', background:'none', border:'0.5px solid var(--border)', borderRadius:7, padding:'5px', fontSize:11, color:'var(--t3)', cursor:'pointer', fontFamily:'Arial' }}>
                                  ↓ {allCC.length - ccLimit} weitere laden
                                </button>
                              )
                            }
                            return items
                          })()}
                        </div>
                        <div style={{ padding: '6px 8px', flexShrink: 0 }}>
                          <button onClick={() => { setNewCardColId(col.id); setModal('new-card') }} style={{ width: '100%', background: 'none', border: '1.5px dashed var(--brd2)', borderRadius: 7, padding: 6, fontSize: 11, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'Arial', transition: 'all .16s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gdbg)'; e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--brd2)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.transform = 'none' }}>+ Karte</button>
                        </div>
                      </>
                    )}
                  </div>
                )
                })())
                })
                return colItems
              })()}
              <div onClick={() => setModal('new-col')} style={{ width: 44, minWidth: 44, border: '2px dashed var(--brd2)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 60, flexShrink: 0 }}>
                <span style={{ fontSize: 18, color: 'var(--t3)' }}>+</span>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
              <div style={{ maxWidth: 740 }}>
                {cols.map(col => (
                  <div key={col.id} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 7, borderBottom: '2px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot_color }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{col.title}</span>
                      <span style={{ fontSize: 11, background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, color: 'var(--t3)' }}>{cardsForCol(col.id).length}</span>
                    </div>

                    {cardsForCol(col.id).map(card => (
                      <div key={card.id} onClick={() => setActiveCard(card)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 4, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>{card.is_todo ? '✓' : (findType(getTypes(photoCats), card.card_type)||{i:''}).i}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{card.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{card.client_name || ''}{card.card_date ? ' · ' + fmtDate(card.card_date) + (card.card_time ? ' ' + fmtTime(card.card_time) : '') : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR ── */}
      {tab === 'gcal' && (
        <GoogleCalendarView staff={staff} me={me} supabase={supabase} cols={cols} onImported={() => { loadCards(); broadcastChange('cards_changed') }} />
      )}

      {tab === 'fahrtenbuch' && (
        <Fahrtenbuch staff={staff} cards={cards} me={me} isAdmin={isAdminOrSub} supabase={supabase} />
      )}
      {tab === 'buchen' && (
        <BuchungenView supabase={supabase} staff={staff} me={me} />
      )}
      {tab === 'amelia' && (
        <AmeliaView staff={staff} me={me} />
      )}
      {tab === 'calendar' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 'clamp(180px, 22vw, 260px)', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>📋 Heutige Karten</div>
              <button onClick={() => setModal('new-card')} className='btn-primary-anim' style={{ ...BTNP, width: '100%', padding: '6px', fontSize: 12, justifyContent: 'center', display: 'flex', marginBottom: 6 }}>+ Neue Karte</button>
              {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && !cols.find(c => c.title === 'GCal Import') && (
                <button onClick={ensureGCalImportCol} style={{ width: '100%', background: 'rgba(29,94,199,.08)', border: '0.5px solid rgba(29,94,199,.25)', borderRadius: 7, padding: '6px', fontSize: 11, fontWeight: 700, color: '#1d5ec7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <i className="ti ti-download" style={{ fontSize: 11 }} /> GCal Import Spalte erstellen
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {cards.filter(c => c.card_date === new Date().toISOString().slice(0, 10)).map(card => {
                const t = findType(getTypes(photoCats), card.card_type) || { i:'', l:'Foto', c:'#6b6b6e', bg:'#6b6b6e22', br:'#6b6b6e55' }
                return (
                  <div key={card.id} onClick={() => setActiveCard(card)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: '3px solid ' + t.c, borderRadius: 7, padding: '8px 9px', marginBottom: 6, cursor: 'pointer', fontSize: 11 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{card.title}</div>
                    <div style={{ color: 'var(--t3)' }}>{card.card_time ? fmtTime(card.card_time) + ' · ' : ''}{card.addr || ''}</div>
                  </div>
                )
              })}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Kalender</div>
                {CALS.map(cal => (
                  <div key={cal.id} onClick={() => setCalFilters(prev => prev.includes(cal.id) ? prev.filter(x => x !== cal.id) : [...prev, cal.id])} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, cursor: 'pointer' }}>
                    <div style={{ width: 13, height: 13, borderRadius: 3, background: calFilters.includes(cal.id) ? cal.color : 'transparent', border: '2px solid ' + cal.color, flexShrink: 0, transition: '.15s' }} />
                    <span style={{ fontSize: 11, color: 'var(--t2)' }}>{cal.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ height: 38, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', flexShrink: 0 }}>
              {['WEEK', 'MONTH', 'DAY', 'AGENDA'].map(v => (
                <button key={v} onClick={() => setCalView(v)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid ' + (calView === v ? 'var(--gold)' : 'var(--border)'), background: calView === v ? 'var(--gdbg)' : 'none', color: calView === v ? 'var(--gold)' : 'var(--t3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {v === 'WEEK' ? 'Woche' : v === 'MONTH' ? 'Monat' : v === 'DAY' ? 'Tag' : 'Liste'}
                </button>
              ))}
            </div>
            <iframe key={calFilters.join() + calView} style={{ flex: 1, border: 'none', width: '100%' }} src={calSrc} />
          </div>
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === 'clients' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>🤝 Kunden</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {selClients.size > 0 && <button onClick={() => deleteClientsBulk([...selClients])} style={{ ...BTNR, padding: '6px 12px', fontSize: 12 }}>🗑 {selClients.size} löschen</button>}
              <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setClientView('cards')} style={{ padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: clientView === 'cards' ? 'var(--gold)' : 'var(--bg2)', color: clientView === 'cards' ? '#fff' : 'var(--t2)' }}>▦ Karten</button>
                <button onClick={() => setClientView('list')} style={{ padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: clientView === 'list' ? 'var(--gold)' : 'var(--bg2)', color: clientView === 'list' ? '#fff' : 'var(--t2)' }}>☰ Liste</button>
              </div>
              <button onClick={exportClients} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>📤 Export</button>
              <button onClick={findClientDuplicates} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }} title="Doppelte Kunden finden">🔍 Duplikate prüfen</button>
              {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && <button onClick={() => setMaklerModal(true)} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🗓️ Makler-Termine</button>}
              <label style={{ ...BTNG, padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'inline-flex' }}>
                📥 Import
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={importClients} />
              </label>
              <button onClick={() => { setEditClient(null); setClientColorState(''); setClientSpJson('{}'); setModal('client') }} className='btn-primary-anim' style={{ ...BTNP, padding: '6px 12px', fontSize: 12, display: (me?.role_level==='admin'||me?.role_level==='subadmin') ? '' : 'none' }}>+ Neuer Kunde</button>
              {me?.can_invoice && <button onClick={() => { window.open('/rechnungen', '_blank') }} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🧾 Abrechnung</button>}
              {me?.can_invoice && <button onClick={openBillomatImport} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🧾 Billomat</button>}
              {me?.can_invoice && <button onClick={openMonthly} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🗓️ Monatsabrechnung</button>}
              {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && <button onClick={() => setMaklerModal(true)} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🗓️ Makler-Termine</button>}
              {me?.role_level === 'admin' && <button onClick={openFixClients} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🔧 Karten-Kunden</button>}
              {me?.role_level === 'admin' && <button onClick={openDuplicates} style={{ ...BTNG, padding: '6px 12px', fontSize: 12 }}>🔁 Duplikate</button>}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>
            CSV-Kopfzeile: Firmenname, Kürzel, Adresse, Email, Telefon, USt-ID, Kategorie, Kontaktperson, Kontakt-Email, Kontakt-Tel
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:9, padding:'8px 12px', marginBottom:14 }}>
            <i className="ti ti-search" style={{ fontSize:14, color:'var(--t3)' }} />
            <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Kunde suchen… (Name, Kürzel, Adresse, E-Mail, Tel, Makler)"
              style={{ flex:1, border:'none', background:'none', outline:'none', fontSize:13, color:'var(--t1)' }} />
            {clientSearch && <button onClick={()=>setClientSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:16, lineHeight:1 }}>×</button>}
          </div>
          {clientView === 'cards' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {clients.length === 0 && <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Noch keine Kunden</div>}
            {(() => {
              const q = clientSearch.trim().toLowerCase()
              const vis = q ? clients.filter(cl => [cl.name, cl.short_name, cl.addr, cl.email, cl.tel, cl.category].concat((maklers[cl.id]||[]).map(m=>m.name)).some(v => (v||'').toLowerCase().includes(q))) : clients
              if (clients.length > 0 && vis.length === 0) return <div style={{ gridColumn:'1/-1', padding:24, textAlign:'center', color:'var(--t3)', fontSize:13 }}>Keine Treffer für „{clientSearch}"</div>
              return vis.map(cl => (
              <div key={cl.id} onClick={() => { setEditClient(cl); setClientColorState(cl.color||''); setClientSpJson(JSON.stringify(cl?.service_prices||{})); setModal('client') }} style={{ background: (() => { const _t = {'peach':'rgba(255,190,152,.18)','mocha':'rgba(166,123,91,.18)','ciel':'rgba(123,191,203,.18)','apricot':'rgba(232,168,124,.18)','sage':'rgba(156,175,136,.18)','artgold':'rgba(201,169,110,.18)','granite':'rgba(181,196,177,.18)','rose':'rgba(212,165,165,.18)','cerulean':'rgba(168,197,218,.18)','slate':'rgba(107,124,147,.18)','caramel':'rgba(196,149,106,.18)','laurel':'rgba(143,166,142,.18)','flamingo':'rgba(212,134,155,.18)','steel':'rgba(123,158,166,.18)'}[cl.color]; return _t ? ('linear-gradient(0deg,'+_t+','+_t+'), var(--bg2)') : 'var(--bg2)' })(), border: '0.5px solid ' + (cl.color ? {'peach':'rgba(255,190,152,.35)','mocha':'rgba(166,123,91,.35)','ciel':'rgba(123,191,203,.35)','apricot':'rgba(232,168,124,.35)','sage':'rgba(156,175,136,.35)','artgold':'rgba(201,169,110,.35)','granite':'rgba(181,196,177,.35)','rose':'rgba(212,165,165,.35)','cerulean':'rgba(168,197,218,.35)','slate':'rgba(107,124,147,.35)','caramel':'rgba(196,149,106,.35)','laurel':'rgba(143,166,142,.35)','flamingo':'rgba(212,134,155,.35)','steel':'rgba(123,158,166,.35)'}[cl.color]||'var(--border)' : 'var(--border)'), borderRadius: 11, padding: '14px 16px', cursor: 'pointer', boxShadow: 'var(--sh)', transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s,border-color .15s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px) scale(1.01)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.10)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--sh)'}}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <ClientAvatar cl={cl} favicon={clientFavicon(cl)} initials={clientInitials(cl.name)} />
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanClientName(cl.name)}</div>
                  </div>
                  {cl.short_name && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, background: 'var(--gdbg)', padding: '1px 7px', borderRadius: 4, marginLeft: 6, flexShrink: 0 }}>{cl.short_name}</span>}
                </div>
                {cl.addr && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 5 }}>{cl.addr}</div>}
                {cl.email && <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 2 }}>📧 {cl.email}</div>}
                {cl.tel && <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 5 }}>📞 {cl.tel}</div>}
                {maklers[cl.id]?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 5 }}>
                    {maklers[cl.id].map(m => (
                      <div key={m.id} style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>
                        👤 {m.name}{m.email && <span style={{ color: 'var(--blue)' }}> · {m.email}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 6, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ background: 'var(--gdbg)', color: 'var(--gold)', borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>{cl.category || ''}</span>
                  {(() => {
                    const count = cards.filter(card => card.client_name === cl.name || card.client_name === cl.short_name).length
                    return count > 0 ? <span style={{ background:'var(--bluebg)', color:'var(--blue)', borderRadius:4, fontSize:10, fontWeight:700, padding:'2px 6px' }}>📷 {count} Aufnahme</span> : null
                  })()}
                </div>
              </div>
              ))
            })()}
          </div>}
          {clientView === 'list' && (() => {
            const vis = getVisClients()
            const allSel = vis.length > 0 && vis.every(c => selClients.has(c.id))
            return (
              <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 11, background: 'var(--bg2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--t3)' }}>
                    <th style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}><input type="checkbox" checked={allSel} onChange={() => setSelClients(allSel ? new Set() : new Set(vis.map(c => c.id)))} style={{ width: 15, height: 15, accentColor: 'var(--gold)', cursor: 'pointer' }} /></th>
                    {['Firmenname', 'Kürzel', 'Adresse', 'E-Mail', 'Telefon', 'Aufnahmen'].map((h, i) => <th key={i} style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {vis.map(cl => { const sel = selClients.has(cl.id); const count = cards.filter(card => card.client_name === cl.name || card.client_name === cl.short_name).length; return (
                      <tr key={cl.id} style={{ borderBottom: '0.5px solid var(--border)', background: sel ? 'var(--gdbg)' : 'transparent', cursor: 'pointer' }} onClick={(e) => { if (e.target.type === 'checkbox') return; setEditClient(cl); setClientColorState(cl.color || ''); setClientSpJson(JSON.stringify(cl?.service_prices || {})); setModal('client') }}>
                        <td style={{ padding: '8px 10px' }} onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel} onChange={() => setSelClients(s => { const n = new Set(s); n.has(cl.id) ? n.delete(cl.id) : n.add(cl.id); return n })} style={{ width: 15, height: 15, accentColor: 'var(--gold)', cursor: 'pointer' }} /></td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <ClientAvatar cl={cl} favicon={clientFavicon(cl)} initials={clientInitials(cl.name)} />
                            <span>{cleanClientName(cl.name)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--gold)', fontWeight: 700 }}>{cl.short_name || ''}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--t3)' }}>{cl.addr || ''}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--t2)' }}>{cl.email || ''}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{cl.tel || ''}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{count > 0 ? ('📷 ' + count) : ''}</td>
                      </tr>) })}
                    {vis.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--t3)' }}>{clients.length ? ('Keine Treffer für „' + clientSearch + '"') : 'Noch keine Kunden'}</td></tr>}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── STAFF ── */}
      {tab === 'staff' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>👥 Mitarbeiter</span>
            <button onClick={() => { setEditStaff(null); setStaffAvatarData(null); setModal('staff') }} className='btn-primary-anim' style={{ ...BTNP, padding: '6px 12px', fontSize: 12, display: (me?.role_level==='admin'||me?.role_level==='subadmin') ? '' : 'none' }}>+ Mitarbeiter</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {staff.map(s => (
              <div key={s.id}
                onClick={() => { setEditStaff(s); setStaffAvatarData(null); setModal('staff') }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.12)'; e.currentTarget.style.borderColor=s.color+'88'; const av=e.currentTarget.querySelector('.staff-av-circle'); if(av){av.style.transform='scale(1.12)';av.style.border='2px solid '+s.color} }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--sh)'; e.currentTarget.style.borderColor='var(--border)'; const av=e.currentTarget.querySelector('.staff-av-circle'); if(av){av.style.transform='none';av.style.border='2px solid transparent'} }}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--sh)', transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s,border-color .15s' }}>
                <div className="staff-av-circle" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px', background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: s.color, overflow: 'hidden', border: '4px solid transparent', transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), border-color .15s' }}>
                  {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 7 }}>{s.role}</div>
                {s.email && <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 2 }}>📧 {s.email}</div>}
                {s.tel && <div style={{ fontSize: 11, color: 'var(--t2)' }}>📞 {s.tel}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TELEFONBUCH ── */}
      {tab === 'phonebook' && !isDemo && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Phonebook Header */}
          <div style={{ height: 42, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0 }}>
            <i className="ti ti-address-book" style={{ fontSize: 16, color: 'var(--gold)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Telefonbuch</span>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{phonebook.length} Kontakte</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 7, padding: '4px 10px', width: 220 }}>
              <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--t3)', flexShrink: 0 }} />
              <input value={pbSearch} onChange={e => setPbSearch(e.target.value)} placeholder="Suchen…"
                style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--t1)', outline: 'none', width: '100%', fontFamily: 'Arial' }} />
              {pbSearch && <span onClick={() => setPbSearch('')} style={{ fontSize: 11, color: 'var(--t3)', cursor: 'pointer' }}>✕</span>}
            </div>
            <button onClick={() => setPbShowImport(true)} style={{ ...BTNG, padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-upload" style={{ fontSize: 12 }} /> Import
            </button>
            <button onClick={() => { setPbSelected({ name:'', org:'', phones:[], emails:[], category:'Makler' }); setPbEditing(true) }} style={{ ...BTNP, padding: '5px 11px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Neu
            </button>
            {isAdminOrSub && (
              <button onClick={() => {
                const rows = [['Name','Unternehmen','Telefon','E-Mail','Kategorie']]
                phonebook.forEach(c => rows.push([c.name||'', c.org||'', (c.phones||[]).map(p=>p.n).join('; '), (c.emails||[]).join('; '), c.category||'']))
                const csv = rows.map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
                const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='telefonbuch.csv'; a.click()
              }} style={{ ...BTNG, padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-download" style={{ fontSize: 12 }} /> Export
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg2)', flexShrink: 0 }}>
            {['all','Makler','Firma','Privat','Bauträger'].map(f => (
              <span key={f} onClick={() => setPbFilter(f)}
                style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  background: pbFilter === f ? 'var(--gold)' : 'var(--bg3)',
                  color: pbFilter === f ? '#fff' : 'var(--t3)',
                  border: pbFilter === f ? 'none' : '0.5px solid var(--border)' }}>
                {f === 'all' ? 'Alle' : f}
              </span>
            ))}
            {pbChecked.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{pbChecked.length} ausgewählt</span>
                {isAdminOrSub && (
                  <select onChange={async e => {
                    if (!e.target.value) return
                    await Promise.all(pbChecked.map(id => supabase.from('phone_book').update({ category: e.target.value }).eq('id', id)))
                    loadPhonebook(); setPbChecked([])
                  }} style={{ fontSize: 11, borderRadius: 5, border: '0.5px solid var(--border)', background: 'var(--bg3)', color: 'var(--t2)', padding: '2px 6px' }}>
                    <option value="">Kategorie ändern…</option>
                    {['Makler','Firma','Privat','Bauträger'].map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
                <button onClick={async () => {
                  if (!confirm(pbChecked.length + ' Kontakte löschen?')) return
                  await Promise.all(pbChecked.map(id => supabase.from('phone_book').delete().eq('id', id)))
                  loadPhonebook(); setPbChecked([])
                }} style={{ fontSize: 11, padding: '2px 8px', color: 'var(--red)', border: '0.5px solid var(--rdbr)', borderRadius: 5, background: 'var(--rdbg)', cursor: 'pointer' }}>
                  <i className="ti ti-trash" style={{ fontSize: 11 }} /> Löschen
                </button>
              </div>
            )}
          </div>

          {/* List + Detail */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {/* Left list */}
            <div style={{ width: 280, borderRight: '0.5px solid var(--border)', overflowY: 'auto', background: 'var(--bg2)' }}>
              {(() => {
                const filtered = phonebook.filter(c => {
                  if (pbFilter !== 'all' && c.category !== pbFilter) return false
                  if (pbSearch) {
                    const q = pbSearch.toLowerCase()
                    return (c.name||'').toLowerCase().includes(q) || (c.org||'').toLowerCase().includes(q) || (c.emails||[]).some(e=>e.toLowerCase().includes(q))
                  }
                  return true
                })
                const groups = {}
                filtered.forEach(c => {
                  const l = (c.name||'?')[0].toUpperCase()
                  if (!groups[l]) groups[l] = []
                  groups[l].push(c)
                })
                return Object.keys(groups).sort().map(letter => (
                  <div key={letter}>
                    <div style={{ padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, color: 'var(--t3)', background: 'var(--bg3)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {letter}
                    </div>
                    {groups[letter].map(c => (
                      <div key={c.id} onClick={() => { setPbSelected(c); setPbEditing(false) }}
                        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', borderBottom: '0.5px solid var(--border)', borderLeft: pbSelected?.id === c.id ? '3px solid var(--gold)' : '3px solid transparent', background: pbSelected?.id === c.id ? 'rgba(184,137,42,.06)' : 'transparent' }}>
                        <input type="checkbox" checked={pbChecked.includes(c.id)} onClick={e => e.stopPropagation()}
                          onChange={e => setPbChecked(p => e.target.checked ? [...p, c.id] : p.filter(x => x !== c.id))}
                          style={{ flexShrink: 0 }} />
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gdbg)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {(c.name||'?').split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.org || (c.phones||[])[0]?.n || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>

            {/* Right detail/edit */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)' }}>
              {pbSelected ? (
                pbEditing ? (
                  /* EDIT FORM */
                  <div style={{ maxWidth: 480 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{pbSelected.id ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</div>
                    <div style={{ marginBottom: 9 }}><label style={LS}>Name *</label><input defaultValue={pbSelected.name||''} id="pb-name" style={IS} /></div>
                    <div style={{ marginBottom: 9 }}><label style={LS}>Unternehmen</label><input defaultValue={pbSelected.org||''} id="pb-org" style={IS} /></div>
                    <div style={{ marginBottom: 9 }}>
                      <label style={LS}>Kategorie</label>
                      <select id="pb-cat" defaultValue={pbSelected.category||'Makler'} style={IS}>
                        {['Makler','Firma','Privat','Bauträger'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 6, marginTop: 10 }}>Telefon</div>
                    {(pbSelected.phones||[{t:'Mobil',n:''}]).map((p,i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <select defaultValue={p.t||'Mobil'} style={{ ...IS, width: 80 }}>
                          {['Mobil','Büro','Fax'].map(t=><option key={t}>{t}</option>)}
                        </select>
                        <input defaultValue={p.n} style={{ ...IS, flex: 1 }} />
                      </div>
                    ))}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 6, marginTop: 10 }}>E-Mail</div>
                    {(pbSelected.emails||['']).map((e,i) => (
                      <input key={i} defaultValue={e} style={{ ...IS, marginBottom: 6 }} />
                    ))}
                    <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
                      <button type="button" onClick={() => setPbEditing(false)} style={BTNG}>Abbrechen</button>
                      <button type="button" onClick={async () => {
                        const name = document.getElementById('pb-name')?.value || ''
                        const org = document.getElementById('pb-org')?.value || ''
                        const cat = document.getElementById('pb-cat')?.value || 'Makler'
                        const data = { name, org, category: cat, phones: pbSelected.phones||[], emails: pbSelected.emails||[] }
                        if (pbSelected.id) await supabase.from('phone_book').update(data).eq('id', pbSelected.id)
                        else await supabase.from('phone_book').insert(data)
                        loadPhonebook(); setPbEditing(false)
                      }} style={BTNP}>Speichern</button>
                    </div>
                  </div>
                ) : (
                  /* VIEW */
                  <div style={{ maxWidth: 480 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--gdbg)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                        {(pbSelected.name||'?').split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', marginBottom: 3 }}>{pbSelected.name}</div>
                        {pbSelected.org && <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>{pbSelected.org}</div>}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--gdbg)', color: 'var(--gold)' }}>{pbSelected.category||'Makler'}</span>
                      </div>
                      {isAdminOrSub && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setPbEditing(true)} style={{ ...BTNG, padding: '5px 10px', fontSize: 12 }}>
                            <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Bearbeiten
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Kontakt löschen?')) return
                            await supabase.from('phone_book').delete().eq('id', pbSelected.id)
                            setPbSelected(null); loadPhonebook()
                          }} style={{ ...BTNR, padding: '5px 8px', fontSize: 12 }}>
                            <i className="ti ti-trash" style={{ fontSize: 12 }} />
                          </button>
                        </div>
                      )}
                    </div>
                    {(pbSelected.phones||[]).length > 0 && (
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Telefon</div>
                        {(pbSelected.phones||[]).map((p,i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: i>0?'0.5px solid var(--border)':'none' }}>
                            <span style={{ fontSize: 11, color: 'var(--t3)', width: 48 }}>{p.t||'Tel'}</span>
                            <a href={'tel:'+p.n} style={{ fontSize: 13, color: 'var(--t1)', textDecoration: 'none', flex: 1 }}>{p.n}</a>
                            <i className="ti ti-phone" style={{ fontSize: 12, color: 'var(--gold)' }} />
                          </div>
                        ))}
                      </div>
                    )}
                    {(pbSelected.emails||[]).filter(Boolean).length > 0 && (
                      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>E-Mail</div>
                        {(pbSelected.emails||[]).filter(Boolean).map((e,i) => (
                          <a key={i} href={'mailto:'+e} style={{ display: 'block', fontSize: 13, color: '#0891b2', textDecoration: 'none', padding: '3px 0' }}>{e}</a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div style={{ color: 'var(--t3)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                  <i className="ti ti-address-book" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                  Kontakt auswählen
                </div>
              )}
            </div>
          </div>
        </div>
      )}

            {/* ── FOOTER STATS ── */}
      <div style={{ height: 44, background: 'var(--bg2)', borderTop: '2px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: 'var(--t2)', fontSize: 13 }}>📊</span>
        <span style={{ color: 'var(--t2)' }}>Diese Woche: <strong style={{ color: 'var(--gold)', fontSize: 13 }}>{stats.week}</strong></span>
        <span style={{ color: 'var(--t2)' }}>Diesen Monat: <strong style={{ color: 'var(--blue)', fontSize: 13 }}>{stats.month}</strong></span>
        <span style={{ color: 'var(--t2)' }}>Dieses Jahr: <strong style={{ color: 'var(--green)', fontSize: 13 }}>{stats.year}</strong></span>
        {tab === 'board' && showWidgets && (
          <button onClick={() => setCustomWidgetModal(true)} style={{ background:'var(--gdbg)', color:'var(--gold)', border:'1px solid var(--gold)', borderRadius:7, padding:'3px 10px', fontSize:11, cursor:'pointer', fontWeight:700 }}>+ Eigenes Widget</button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Némító gomb */}
          <button onClick={()=>setChatMuted(p=>!p)} title={chatMuted?'Ton einschalten':'Ton ausschalten'}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', color:'var(--t3)', display:'flex', alignItems:'center', transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--gold)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>
            <i className={'ti ' + (chatMuted ? 'ti-volume-off' : 'ti-volume')} style={{ fontSize:16 }} />
          </button>
          {/* Team Chat gomb IP logóval */}
          <div onClick={() => { setChatOpen(p => !p); setUnreadChat(0) }}
            style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, background: chatOpen ? 'var(--gdbg)' : 'var(--bg3)', border: unreadChat>0 ? '1px solid var(--red)' : '1px solid var(--border)', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:600, color:'var(--t2)', position:'relative', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--gdbg)';e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.transform='scale(1.04)'}}
            onMouseLeave={e=>{e.currentTarget.style.background=chatOpen?'var(--gdbg)':'var(--bg3)';e.currentTarget.style.borderColor=unreadChat>0?'var(--red)':'var(--border)';e.currentTarget.style.transform='none'}}>
            {unreadChat > 0 && <span className="chat-unread-dot" />}
            <audio ref={chatAudioRef} src="/sounds/chat-pop.mp3" preload="auto" />
            <img src="/ip-logo.png" style={{ width:18, height:18, objectFit:'contain', borderRadius:'50%' }} alt="IP" />
            <span>Chat</span>
            {unreadChat > 0 && <span style={{ background:'var(--red)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700 }}>{unreadChat}</span>}
          </div>
          <div onClick={() => setAiOpen(p=>!p)}
            style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:5, background: aiOpen?'rgba(217,119,87,.15)':'rgba(217,119,87,.08)', border:'1px solid rgba(217,119,87,.3)', borderRadius:20, padding:'4px 11px', fontSize:12, fontWeight:600, color:'#d97757', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(217,119,87,.2)';e.currentTarget.style.transform='scale(1.04)'}}
            onMouseLeave={e=>{e.currentTarget.style.background=aiOpen?'rgba(217,119,87,.15)':'rgba(217,119,87,.08)';e.currentTarget.style.transform='none'}}>
            <ClaudeAvatar size={16} />
            Claude
          </div>
        </div>
      </div>

      {/* ── AI PANEL ── */}
      {aiOpen && (
        <div style={{ position:'fixed', bottom:64, right:20, width:380, maxWidth:'calc(100vw - 40px)', height:'min(70vh, 600px)', maxHeight:'calc(100vh - 140px)', background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:16, zIndex:310, display:'flex', flexDirection:'column', boxShadow:'0 12px 40px rgba(120,90,30,.16)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0, background:'var(--bg3)' }}>
            <ClaudeAvatar size={32} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>Claude · ImmoPixels</div>
              <div style={{ fontSize:10, color:'var(--t3)' }}>Sieht Karten, Kunden und Statistiken</div>
            </div>
            <button onClick={() => setAiMessages([{ role:'assistant', content:'Szia! Miben segíthetek?' }])} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:11, padding:'3px 7px', borderRadius:5 }}>🗑 Löschen</button>
            <button onClick={() => setAiOpen(false)} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            {aiMessages.map((msg, i) => (
              <div key={i} style={{ display:'flex', gap:8, flexDirection:msg.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', background:msg.role==='user'?'var(--gdbg)':'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                  {msg.role==='user'
                    ? <span style={{ fontSize:11, fontWeight:700, color:'var(--gold)' }}>{getMe()?.init||'CD'}</span>
                    : <ClaudeAvatar size={28} />}
                </div>
                <div style={{ maxWidth:'82%', fontSize:13, background:msg.role==='user'?'var(--gold)':'var(--bg3)', color:msg.role==='user'?'#fff':'var(--t1)', borderRadius:msg.role==='user'?'12px 2px 12px 12px':'2px 12px 12px 12px', padding:'9px 12px', lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>🤖</div>
                <div style={{ background:'var(--bg3)', borderRadius:'2px 12px 12px 12px', padding:'9px 14px', fontSize:13 }}>
                  <span style={{ animation:'pulse 1s infinite' }}>● ● ●</span>
                </div>
              </div>
            )}
            <div ref={aiEndRef}/>
          </div>
          <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontSize:10, color:'var(--t3)', marginBottom:6, display:'flex', gap:6, flexWrap:'wrap' }}>
              {['Heutige Aufnahmen?','Karte erstellen: Test','Statistik diese Woche','Karte nach Fertig verschieben'].map(q=>(
                <span key={q} onClick={()=>{setAiInput(q)}} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:'3px 8px', cursor:'pointer', fontSize:10 }}>{q}</span>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()} }} placeholder="Frag auf Deutsch... (Enter = küldés)" rows={2} style={{ flex:1, background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:8, padding:'8px 10px', fontSize:12, outline:'none', resize:'none', fontFamily:'Arial', lineHeight:1.4 }}/>
              <button onClick={sendAI} disabled={aiLoading} style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:8, padding:'0 14px', fontSize:16, cursor:'pointer', opacity:aiLoading?.6:1 }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIDGETS ── */}
      {showWidgets && tab === 'board' && widgets.map(w => {
        if (w.disabled) return null
        if (!w.open) return null
        if (w.type === 'makler' && me?.role_level !== 'admin') return null
        const ICONS = { weather:'🌤️', todo:'✅', nexttermin:'📅', stats:'📊', makler:'📋' }
        const TITLES = { weather:'Wetter', todo:'To Do', nexttermin:'Nächster Termin', stats:'Statistik', makler:'Makler / Monat' }
        const HEADGRAD = w.type==='weather'?'linear-gradient(135deg,#9fd5df,#7BBFCB)':w.type==='todo'?'linear-gradient(135deg,#dcc088,#C9A96E)':w.type==='nexttermin'?'linear-gradient(135deg,#b8cca8,#9CAF88)':w.type==='stats'?'linear-gradient(135deg,#ffd4b0,#FFBE98)':w.type==='makler'?'linear-gradient(135deg,#c9a96e,#6b6b6e)':'linear-gradient(135deg,#c49a75,#A67B5B)'
        const headBg = w.headerColor || HEADGRAD
        const headFg = w.headerColor ? '#fff' : (w.type==='stats'?'#7a3a10':'#fff')
        return (
          <div key={w.id}
            className="widget-overlay" style={{ position:'fixed', left:Math.min(w.x, typeof window!=='undefined'?window.innerWidth-w.w-10:9999), top:Math.max(0,Math.min(w.y, typeof window!=='undefined'?window.innerHeight-50:9999)), width:w.w, minWidth:200, minHeight: minimizedWidgets.includes(w.id)?0:120, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--sh2)', zIndex:180, userSelect:'none', overflow:'hidden', resize: minimizedWidgets.includes(w.id)?'none':'both' }}
            onMouseDown={e => {
              if (e.target.closest('.widget-content')) return
              const sx = e.clientX - w.x, sy = e.clientY - w.y
              setDraggingWidget(w.id)
              function mm(ev) {
                const maxX = window.innerWidth - w.w - 10
                const maxY = window.innerHeight - 50
                const nx = Math.max(0, Math.min(ev.clientX-sx, maxX))
                const ny = Math.max(0, Math.min(ev.clientY-sy, maxY))
                saveWidgets(widgets.map(ww => ww.id===w.id ? {...ww, x:nx, y:ny} : ww))
              }
              function mu() { setDraggingWidget(null); window.removeEventListener('mousemove',mm); window.removeEventListener('mouseup',mu) }
              window.addEventListener('mousemove',mm)
              window.addEventListener('mouseup',mu)
            }}>
            <div style={{ padding:'9px 12px', background: headBg, borderBottom:'none', display:'flex', alignItems:'center', gap:7, cursor:'grab', opacity: minimizedWidgets.includes(w.id) ? 0.5 : 1, transition:'opacity .2s', position:'relative' }}>
              <i className={'ti ' + (w.type==='weather'?'ti-cloud':w.type==='todo'?'ti-check':w.type==='nexttermin'?'ti-calendar':w.type==='stats'?'ti-chart-bar':w.type==='makler'?'ti-building-community':'ti-layout-grid')} style={{ fontSize:15, color: headFg }} />
              <span style={{ fontSize:12, fontWeight:700, flex:1, color: headFg }}>{w.title || TITLES[w.type]}</span>
              <button onClick={(e)=>{ e.stopPropagation(); setColorPickerWidget(colorPickerWidget===w.id?null:w.id) }} title="Farbe ändern" style={{ background:'none', border:'none', cursor:'pointer', color:headFg, padding:'2px 4px', display:'flex', alignItems:'center', opacity:.85 }}>
                <i className="ti ti-palette" style={{ fontSize:13 }} />
              </button>
              {colorPickerWidget===w.id && (
                <div onMouseDown={e=>e.stopPropagation()} style={{ position:'absolute', top:36, right:6, zIndex:300, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:8, boxShadow:'var(--sh2)', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, width:158 }}>
                  {['#6b6b6e','#7BBFCB','#9CAF88','#FFBE98','#A67B5B','#6d28d9','#d4537e','#378add','#e24b4a','#5f5e5a'].map(col=>(
                    <button key={col} onClick={()=>{ saveWidgets(widgets.map(ww=>ww.id===w.id?{...ww,headerColor:col}:ww)); setColorPickerWidget(null) }} style={{ width:22, height:22, borderRadius:6, background:col, border: w.headerColor===col?'2px solid var(--t1)':'1px solid rgba(0,0,0,.12)', cursor:'pointer' }} />
                  ))}
                  <button onClick={()=>{ saveWidgets(widgets.map(ww=>ww.id===w.id?{...ww,headerColor:null}:ww)); setColorPickerWidget(null) }} style={{ gridColumn:'1/-1', fontSize:11, padding:'4px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', cursor:'pointer', color:'var(--t2)' }}>Standard</button>
                </div>
              )}
              {(w.type==='iframe'||w.type==='html') && (
                <button onClick={() => { setCustomWidgetForm({title:w.title||'',type:w.type,url:w.url||'',html:w.html||'',editId:w.id}); setCustomWidgetModal(true) }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.7)', fontSize:11, padding:'0 4px' }} title="Bearbeiten">✏️</button>
              )}
              <button onClick={() => toggleMinimized(w.id)} style={{ background:'none', border:'none', cursor:'pointer', color: w.type==='stats'?'rgba(120,60,16,.7)':'rgba(255,255,255,.8)', padding:'2px 4px', display:'flex', alignItems:'center' }} title="Minimieren">
                <i className={'ti ' + (minimizedWidgets.includes(w.id)?'ti-chevron-up':'ti-chevron-down')} style={{ fontSize:13 }} />
              </button>
            </div>
            <div className="widget-content" style={{ padding:12, display: minimizedWidgets.includes(w.id) ? ("none") : ("block") }}>
              {w.type==='weather' && (
                <div>
                  <div style={{ display:'flex', gap:5, marginBottom:10 }}>
                    <input value={weatherCityInput || weatherCity} onChange={e => setWeatherCityInput(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter' && weatherCityInput.trim()) { const city=weatherCityInput.trim(); setWeatherCity(city); localStorage.setItem('ip-weather-city',city); setWeatherCityInput('') }}}
                      placeholder="Stadtname..." style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 8px', fontSize:11, outline:'none' }}/>
                    <button onClick={() => { if(weatherCityInput.trim()) { const city=weatherCityInput.trim(); setWeatherCity(city); localStorage.setItem('ip-weather-city',city); setWeatherCityInput('') }}} style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:6, padding:'5px 9px', fontSize:11, cursor:'pointer' }}>🔍</button>
                  </div>
                  {!weatherData && <div style={{ color:'var(--t3)', fontSize:12, textAlign:'center', padding:'10px 0' }}>Wird geladen...</div>}
                  {weatherData?.error && <div style={{ color:'var(--red)', fontSize:12 }}>Nicht gefunden: {weatherCity}</div>}
                  {weatherData && !weatherData.error && (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <span style={{ fontSize:28 }}>{parseInt(weatherData.temp)>25?'☀️':parseInt(weatherData.temp)>15?'⛅':parseInt(weatherData.temp)>5?'🌥️':'❄️'}</span>
                        <div>
                          <div style={{ fontSize:22, fontWeight:700 }}>{weatherData.temp}°C</div>
                          <div style={{ fontSize:11, color:'var(--t3)' }}>{weatherData.desc}</div>
                        </div>
                        <div style={{ fontSize:10, color:'var(--t3)', marginLeft:'auto', textAlign:'right' }}>{weatherData.city}</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                        {(weatherData.days||[]).map((d,i) => (
                          <div key={i} style={{ background:'var(--bg3)', borderRadius:8, padding:'8px', textAlign:'center' }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', marginBottom:3 }}>{i===0?'Heute':i===1?'Morgen':'Morgenután'}</div>
                            <div style={{ fontSize:14 }}>{parseInt(d.avgtempC)>20?'☀️':parseInt(d.avgtempC)>10?'⛅':'🌧️'}</div>
                            <div style={{ fontSize:12, fontWeight:700 }}>{d.maxtempC}° / {d.mintempC}°</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {w.type==='todo' && (
                <div style={{ background:'rgba(201,169,110,.06)', borderRadius:'0 0 10px 10px', padding:'10px 12px' }}>
                  {[...todoItems].sort((a,b)=>(a.done?1:0)-(b.done?1:0)).map((item) => {
                    const ci = todoItems.indexOf(item)
                    return (
                    <div key={ci} className="todo-widget-item" draggable
                      onDragStart={()=>setDragTodoIdx(ci)}
                      onDragOver={e=>e.preventDefault()}
                      onDrop={()=>{ moveTodo(dragTodoIdx, ci); setDragTodoIdx(null) }}
                      onDragEnd={()=>setDragTodoIdx(null)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 0', borderBottom:'0.5px solid rgba(201,169,110,.12)', opacity: dragTodoIdx===ci ? 0.4 : 1, transition:'opacity .12s' }}
                      onMouseEnter={e=>e.currentTarget.querySelector('.todo-del-btn').style.opacity='1'}
                      onMouseLeave={e=>e.currentTarget.querySelector('.todo-del-btn').style.opacity='0'}>
                      <i className="ti ti-grip-vertical" style={{ fontSize:13, color: item.done ? '#d8d2c4' : '#C9A96E', cursor:'grab', flexShrink:0 }} />
                      <div onClick={() => { const t=todoItems.map((x,j)=> j===ci ? {...x,done:!x.done} : x); saveTodos(t) }}
                        style={{ width:14, height:14, borderRadius:'50%', border: item.done ? 'none' : '2px solid #C9A96E', background: item.done ? '#9CAF88' : 'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                        {item.done && <i className="ti ti-check" style={{ fontSize:8, color:'#fff' }} />}
                      </div>
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:item.done?'#aaa8a0':'var(--t1)', textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
                      <button className="todo-del-btn" onClick={() => saveTodos(todoItems.filter((_,j)=>j!==ci))}
                        style={{ background:'none', border:'none', color:'#ccc8c0', cursor:'pointer', fontSize:13, padding:'0 2px', opacity:0, transition:'opacity .12s, color .12s', display:'flex', alignItems:'center' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.color='#ccc8c0'}>
                        <i className="ti ti-x" style={{ fontSize:11 }} />
                      </button>
                    </div>
                    )
                  })}
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    <input value={todoInput} onChange={e => setTodoInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && todoInput.trim()) {
                          saveTodos([...todoItems, { text: todoInput.trim(), done: false }])
                          setTodoInput('')
                        }
                      }}
                      placeholder="+ Neue Aufgabe..."
                      style={{ flex:1, background:'rgba(255,255,255,.7)', border:'0.5px solid rgba(201,169,110,.25)', borderRadius:7, padding:'6px 10px', fontSize:12, outline:'none', color:'var(--t1)', transition:'border-color .15s' }}
                      onFocus={e=>e.target.style.borderColor='#C9A96E'} onBlur={e=>e.target.style.borderColor='rgba(201,169,110,.25)'}
                    />
                    <button onClick={() => { if(todoInput.trim()){saveTodos([...todoItems,{text:todoInput.trim(),done:false}]);setTodoInput('')} }}
                      style={{ width:30, height:30, background:'#C9A96E', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#6b6b6e';e.currentTarget.style.transform='scale(1.05)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#C9A96E';e.currentTarget.style.transform='scale(1)'}}>
                      <i className="ti ti-plus" style={{ fontSize:14 }} />
                    </button>
                  </div>
                </div>
              )}
              {w.type==='nexttermin' && (
                <div>
                  {(() => {
                    const me = getMe()
                    const today = new Date().toISOString().slice(0,10)
                    const upcoming = cards
                      .filter(card => card.card_date >= today && !card.is_todo)
                      .filter(card => !me || (card.card_team||[]).some(ct => ct.staff_id === me.id))
                      .sort((a,b) => (a.card_date+a.card_time) > (b.card_date+b.card_time) ? 1 : -1)
                      .slice(0, 4)
                    if (!upcoming.length) return <div style={{ color:'var(--t3)', fontSize:12 }}>Keine anstehenden Termine</div>
                    return upcoming.map(card => (
                      <div key={card.id} onClick={() => setActiveCard(card)} style={{ padding:'7px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
                        <div style={{ fontSize:12, fontWeight:700 }}>{card.title}</div>
                        <div style={{ fontSize:11, color:'var(--t3)' }}>{fmtDate(card.card_date)} {card.card_time ? fmtTime(card.card_time) : ''} {card.addr ? '· '+card.addr : ''}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}
              {w.type==='stats' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
                    <div style={{ background:'var(--gdbg)', borderRadius:8, padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:700, color:'var(--gold)' }}>{stats.week}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>Diese Woche</div>
                    </div>
                    <div style={{ background:'var(--bluebg)', borderRadius:8, padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:700, color:'var(--blue)' }}>{stats.month}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>Diesen Monat</div>
                    </div>
                    <div style={{ background:'var(--grbg)', borderRadius:8, padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:700, color:'var(--green)' }}>{stats.year}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>Dieses Jahr</div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', textAlign:'center' }}>
                    Gesamt GCal Aufnahmen: <strong style={{ color:'var(--t1)' }}>{cards.filter(c=>c.is_gcal).length}</strong>
                  </div>
                </div>
              )}
              {w.type==='makler' && (() => {
                const monthLabel = m => { const [y,mo]=m.split('-'); return new Date(+y,+mo-1,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'}) }
                const byMonth = {}
                cards.forEach(c => {
                  if (c.is_todo || c.card_type==='todo') return
                  const client = resolveClientObj(c.client_name)
                  if (!client) return
                  let mk = String(c.card_date||'').slice(0,7)
                  if (!/^\d{4}-\d{2}$/.test(mk)) mk = String(c.created_at||'').slice(0,7)
                  if (!/^\d{4}-\d{2}$/.test(mk)) return
                  const name = client.short_name || client.name || '—'
                  byMonth[mk] = byMonth[mk] || {}
                  byMonth[mk][name] = (byMonth[mk][name]||0) + 1
                })
                const monthsSet = new Set(Object.keys(byMonth))
                Object.keys(maklerData).forEach(k => { if(k!=='__open' && (maklerData[k]?.extra||[]).length) monthsSet.add(k) })
                const months = [...monthsSet].sort()
                const openMap = maklerData.__open || {}
                if (!months.length) return <div style={{ color:'var(--t3)', fontSize:12, padding:'4px 2px' }}>Noch keine Kunden-Aufnahmen.<br/><span style={{ fontSize:10 }}>({cards.filter(c=>!c.is_todo&&c.card_type!=='todo'&&resolveClientObj(c.client_name)).length} Kunden-Karten)</span></div>
                return (
                  <div style={{ maxHeight:300, overflowY:'auto', overflowX:'hidden', margin:'-2px', padding:'2px' }}>
                    {months.map(m => {
                      const ms = maklerData[m] || { checked:[], hidden:[], extra:[], rename:{} }
                      const open = (m in openMap) ? openMap[m] : (m === months[months.length-1])
                      const nameSet = new Set([...Object.keys(byMonth[m]||{}), ...(ms.extra||[])])
                      ;(ms.hidden||[]).forEach(h => nameSet.delete(h))
                      let rows = [...nameSet].map(n => ({ name:n, label:(ms.rename||{})[n]||n, count:(byMonth[m]||{})[n]||0, done:(ms.checked||[]).includes(n) }))
                      rows.sort((a,b)=> (a.done?1:0)-(b.done?1:0) || b.count-a.count || a.label.localeCompare(b.label))
                      const total = rows.reduce((s,r)=>s+r.count,0)
                      return (
                        <div key={m} style={{ marginBottom:6, border:'0.5px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
                          <div onClick={()=>saveMakler({ ...maklerData, __open:{ ...openMap, [m]: !open } })}
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', cursor:'pointer', background:'var(--bg3)' }}>
                            <i className={'ti '+(open?'ti-chevron-down':'ti-chevron-right')} style={{ fontSize:14, color:'var(--gold)' }} />
                            <span style={{ fontSize:12, fontWeight:700, flex:1, textTransform:'capitalize' }}>{monthLabel(m)}</span>
                            <span style={{ fontSize:10, color:'var(--t3)' }}>{rows.length} · {total} Aufn.</span>
                          </div>
                          {open && (
                            <div style={{ padding:'4px 8px 8px' }}>
                              {rows.map(r => (
                                <div key={r.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 2px', borderBottom:'0.5px solid var(--border)' }}
                                  onMouseEnter={e=>{const a=e.currentTarget.querySelector('.mk-act'); if(a)a.style.opacity='1'}}
                                  onMouseLeave={e=>{const a=e.currentTarget.querySelector('.mk-act'); if(a)a.style.opacity='0'}}>
                                  <div onClick={()=>{ const ch=ms.checked||[]; maklerUpdMonth(m,{checked: ch.includes(r.name)?ch.filter(x=>x!==r.name):[...ch,r.name]}) }}
                                    style={{ width:15, height:15, borderRadius:5, border: r.done?'none':'2px solid #C9A96E', background:r.done?'#9CAF88':'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                                    {r.done && <i className="ti ti-check" style={{ fontSize:9, color:'#fff' }} />}
                                  </div>
                                  <span style={{ flex:1, fontSize:12, fontWeight:600, color:r.done?'#aaa8a0':'var(--t1)', textDecoration:r.done?'line-through':'none', wordBreak:'break-word' }}>{r.label}</span>
                                  {r.count>0 && <span style={{ fontSize:10, color:'var(--t3)', background:'var(--bg3)', borderRadius:10, padding:'1px 7px', flexShrink:0 }}>{r.count}</span>}
                                  <span className="mk-act" style={{ display:'flex', gap:2, opacity:0, transition:'opacity .12s', flexShrink:0 }}>
                                    <button onClick={()=>{ const nn=prompt('Umbenennen:', r.label); if(nn&&nn.trim()) maklerUpdMonth(m,{rename:{...(ms.rename||{}), [r.name]:nn.trim()}}) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#b9b1a0', padding:2, fontSize:12 }} title="Umbenennen"><i className="ti ti-pencil"/></button>
                                    <button onClick={()=>{ maklerUpdMonth(m,{hidden:[...(ms.hidden||[]), r.name]}) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#d99', padding:2, fontSize:12 }} title="Entfernen"><i className="ti ti-trash"/></button>
                                  </span>
                                </div>
                              ))}
                              <button onClick={()=>{ const nn=prompt('Makler hinzufügen:'); if(nn&&nn.trim()) maklerUpdMonth(m,{extra:[...(ms.extra||[]), nn.trim()], hidden:(ms.hidden||[]).filter(x=>x!==nn.trim())}) }}
                                style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, background:'none', border:'none', cursor:'pointer', color:'var(--gold)', fontSize:11, fontWeight:700, padding:2 }}>
                                <i className="ti ti-plus" style={{ fontSize:13 }} /> Makler hinzufügen
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {w.type==='iframe' && w.url && (
                <iframe src={w.url} style={{ width:'100%', height:'100%', minHeight:200, border:'none', borderRadius:6 }} />
              )}
              {w.type==='html' && w.html && (
                <div dangerouslySetInnerHTML={{ __html: w.html }} style={{ width:'100%' }} />
              )}
            </div>
          </div>
        )
      })}
      {showWidgets && tab === 'board' && widgets.some(w => !w.open && !w.disabled) && (
        <div style={{ position:'fixed', bottom:50, left:16, display:'flex', gap:6, zIndex:180, flexWrap:'wrap', maxWidth:600 }}>
          {widgets.filter(w=>!w.open && !w.disabled).filter(w=> !(w.type==='makler' && me?.role_level!=='admin')).map(w => (
            <button key={w.id} onClick={() => saveWidgets(widgets.map(ww=>ww.id===w.id?{...ww,open:true}:ww))}
              style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
              {w.type==='weather'?'🌤️':w.type==='todo'?'✅':w.type==='nexttermin'?'📅':w.type==='stats'?'📊':w.type==='makler'?'📋':w.title||'🧩'} öffnen
            </button>
          ))}
        </div>
      )}

      {/* ── CHAT ── */}

      {chatOpen && (
        <TeamChat
          supabase={supabase}
          currentUser={currentUser}
          staff={staff}
          aiOpen={aiOpen}
          onClose={() => { setChatOpen(false); setUnreadChat(0) }}
        />
      )}

            {/* ── CARD DRAWER ── */}
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
      {editColModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.5)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setEditColModal(null)}>
          <div style={{ background:'var(--bg2)', borderRadius:14, width:360, maxWidth:'95vw', padding:22, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'var(--t1)' }}>Spalte bearbeiten</span>
              <button onClick={()=>setEditColModal(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--t3)' }}>✕</button>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>Name</label>
              <input autoFocus value={editColModal.title} onChange={e=>setEditColModal(p=>({...p,title:e.target.value}))}
                style={{ width:'100%', background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:7, padding:'8px 10px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:8 }}>Farbe</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                {['#6b6b6e','#e24b4a','#15803d','#1d5ec7','#7c3aed','#db2777','#0891b2','#ea580c','#4b5563'].map(col=>(
                  <div key={col} onClick={()=>setEditColModal(p=>({...p,dot_color:col}))}
                    style={{ width:22, height:22, borderRadius:'50%', background:col, cursor:'pointer', outline: editColModal.dot_color===col?'3px solid var(--t1)':'none', outlineOffset:2, transition:'transform .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='none'} />
                ))}
                <input type="color" value={editColModal.dot_color||'#6b6b6e'} onChange={e=>setEditColModal(p=>({...p,dot_color:e.target.value}))}
                  style={{ width:32, height:28, border:'none', borderRadius:6, cursor:'pointer', padding:2 }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setEditColModal(null)} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', color:'var(--t2)' }}>Abbrechen</button>
              <button onClick={async()=>{
                await supabase.from('columns').update({ title: editColModal.title, dot_color: editColModal.dot_color }).eq('id', editColModal.id)
                setEditColModal(null); loadCols()
              }} style={{ background:'#6b6b6e', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav" style={{ display:'none' }}>
        {[
          { id:'board', icon:'ti-layout-kanban', label:'Board' },
          { id:'calendar', icon:'ti-calendar', label:'Kalender' },
          { id:'staff', icon:'ti-users', label:'Team' },
          { id:'fahrtenbuch', icon:'ti-car', label:'Fahrten' },
          { id:'profil-link', icon:'ti-user', label:'Profil', href:'/profil' },
        ].map(t => (
          t.href
            ? <a key={t.id} href={t.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, fontSize:9, color:'var(--t3)', textDecoration:'none', padding:'6px 0', flex:1 }}>
                <i className={'ti '+t.icon} style={{ fontSize:20 }} />
                {t.label}
              </a>
            : <div key={t.id} onClick={()=>setTab(t.id)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, fontSize:9, color: tab===t.id?'#6b6b6e':'var(--t3)', padding:'6px 0', flex:1, cursor:'pointer' }}>
                <i className={'ti '+t.icon} style={{ fontSize:20 }} />
                {t.label}
              </div>
        ))}
      </div>
      {birthdayPerson && (
        <BirthdayOverlay
          person={birthdayPerson}
          staff={staff}
          me={me}
          onClose={() => setBirthdayPerson(null)}
        />
      )}
      {gcalPickerOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setGcalPickerOpen(false)}>
          <div style={{ background:'var(--bg2)', borderRadius:14, width:520, maxWidth:'95vw', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <i className="ti ti-brand-google" style={{ fontSize:16, color:'#6b6b6e' }} />
              <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Karte aus Google Kalender</span>
              <button onClick={()=>setGcalPickerOpen(false)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:18 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>
              {gcalPickerLoading && <div style={{ textAlign:'center', padding:30, color:'var(--t3)', fontSize:13 }}>Wird geladen...</div>}
              {!gcalPickerLoading && gcalPickerEvents.length === 0 && (
                <div style={{ textAlign:'center', padding:30, color:'var(--t3)', fontSize:13 }}>
                  <i className="ti ti-calendar-off" style={{ fontSize:28, display:'block', marginBottom:10, opacity:.3 }} />
                  Keine Termine gefunden
                  <div style={{ marginTop:12 }}>
                    <button onClick={()=>{ setGcalPickerOpen(false); setTab('gcal') }}
                      style={{ background:'#6b6b6e', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                      <i className="ti ti-brand-google" style={{fontSize:13}} /> Mit Google verbinden
                    </button>
                  </div>
                </div>
              )}
              {!gcalPickerLoading && gcalPickerEvents.map(ev => (
                <div key={ev.id} onClick={()=>!ev.isDup&&createCardFromGcal(ev)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:5, background: ev.isDup?'var(--bg3)':'var(--bg2)', border:'0.5px solid '+(ev.isDup?'var(--border)':'var(--border)'), cursor:ev.isDup?'default':'pointer', opacity:ev.isDup?0.5:1, transition:'background .12s' }}
                  onMouseEnter={e=>{ if(!ev.isDup) e.currentTarget.style.background='var(--bg3)' }}
                  onMouseLeave={e=>{ if(!ev.isDup) e.currentTarget.style.background='var(--bg2)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.summary}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{ev.date}{ev.time?' · '+ev.time:''} · {ev.cal}</div>
                  </div>
                  {ev.isDup
                    ? <span style={{ fontSize:10, color:'var(--t3)', background:'var(--bg4)', borderRadius:4, padding:'2px 7px' }}>Bereits erstellt</span>
                    : <span style={{ fontSize:10, color:'#6b6b6e', background:'#6b6b6e14', border:'0.5px solid #6b6b6e44', borderRadius:4, padding:'2px 7px' }}>+ Karte</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeCard && (
        <CardModal
          card={activeCard}
          cols={cols}
          staff={staff}
          clients={clients}
          phonebook={phonebook}
          maklers={maklers}
          supabase={supabase}
          onClose={() => setActiveCard(null)}
          onUpdate={(cardId) => { loadCards(); loadCols(); broadcastChange('cards_changed'); if(cardId) broadcastChange('card_editing', { cardId, editing: false, userId: mySessionId.current }) }}
          onFertig={true}
          currentStaff={me}
          sendNotification={sendNotification}
          onSend={(card) => { setActiveCard(null); openSend(card) }}
        />
      )}
      {maklerModal && <MaklerTermineModal cols={cols} clients={clients} onClose={() => setMaklerModal(false)} onDone={() => { loadCards(); loadCols(); }} />}

            {colModal && (
        <ColumnModal col={colModal} onClose={() => setColModal(null)} isAdmin={me?.role_level==='admin' || me?.role_level==='subadmin'}
          onSave={async (name, colorKey, privateCol) => {
            const vtr = privateCol ? ['admin'] : []
            if (colModal.id) {
              await supabase.from('columns').update({ title: name, color: colorKey || null, visible_to_roles: vtr }).eq('id', colModal.id)
            } else {
              const { data: mx } = await supabase.from('columns').select('position').order('position', { ascending: false }).limit(1)
              await supabase.from('columns').insert({ title: name, color: colorKey || null, position: (mx?.[0]?.position || 0) + 1, visible_to_roles: vtr, board_id: activeBoardId || null })
            }
            loadCols(); setColModal(null); broadcastChange('cols_changed')
          }} />
      )}
      {undoToast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#1c1a16', color:'#f4f2ef', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:12, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.25)', minWidth:300, maxWidth:480 }}>
          <i className="ti ti-archive" style={{ fontSize:15, color:'#f97316', flexShrink:0 }}></i>
          <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{undoToast.message}</span>
          <div style={{ width:32, height:32, borderRadius:'50%', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#444" strokeWidth="2.5"/>
              <circle cx="16" cy="16" r="13" fill="none" stroke="#f97316" strokeWidth="2.5"
                strokeDasharray={String(Math.round(2 * Math.PI * 13))}
                strokeDashoffset={String(Math.round(2 * Math.PI * 13 * (1 - undoToast.secs / 5)))}
                strokeLinecap="round" transform="rotate(-90 16 16)"/>
            </svg>
            <span style={{ position:'absolute', fontSize:10, fontWeight:700, color:'#f97316' }}>{undoToast.secs}</span>
          </div>
          <button onClick={() => { if(undoTimerRef.current) clearTimeout(undoTimerRef.current); setUndoToast(null); undoToast.onUndo && undoToast.onUndo() }}
            style={{ background:'none', border:'1px solid rgba(255,255,255,.2)', borderRadius:6, color:'#f4f2ef', fontSize:12, fontWeight:700, padding:'5px 10px', cursor:'pointer', whiteSpace:'nowrap' }}>
            ↩ Rückgängig
          </button>
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel || 'Loeschen'}
          onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
      )}
      {/* ── MODALS ── */}
      {(modal || clientDupModal) && (
        <div onClick={e => { if (e.target === e.currentTarget && modal !== 'client' && modal !== 'staff') { setModal(null); setClientDupModal(false) } }} style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>

          {/* BILLOMAT IMPORT */}
          {modal === 'billomat-import' && (() => {
            const q = bmSearch.trim().toLowerCase()
            const filtered = bmList.filter(c => !q || c.name.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q))
            const selectable = filtered.filter(c => !c.alreadyImported)
            const allSel = selectable.length > 0 && selectable.every(c => bmSel.has(c.billomat_id))
            return (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, width: 600, maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>🧾 Kunden aus Billomat importieren</span>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
                </div>
                <input value={bmSearch} onChange={e => setBmSearch(e.target.value)} placeholder="Suchen (Name / Stadt)…" style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--t1)', marginBottom: 10 }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--t3)' }}>
                  <span>{bmLoading ? 'Lädt…' : `${filtered.length} angezeigt · ${bmSel.size} ausgewählt`}</span>
                  <button onClick={() => { const n = new Set(bmSel); if (allSel) { selectable.forEach(c => n.delete(c.billomat_id)) } else { selectable.forEach(c => n.add(c.billomat_id)) } setBmSel(n) }} disabled={bmLoading || !selectable.length} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{allSel ? 'Auswahl aufheben' : 'Alle (gefiltert)'}</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
                  {filtered.map(c => (
                    <label key={c.billomat_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '0.5px solid var(--brd2)', cursor: c.alreadyImported ? 'default' : 'pointer', opacity: c.alreadyImported ? 0.55 : 1 }}>
                      <input type="checkbox" disabled={c.alreadyImported} checked={c.alreadyImported || bmSel.has(c.billomat_id)} onChange={() => { const n = new Set(bmSel); n.has(c.billomat_id) ? n.delete(c.billomat_id) : n.add(c.billomat_id); setBmSel(n) }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{[c.zip, c.city].filter(Boolean).join(' ')}{c.email ? ' · ' + c.email : ''}</div>
                      </div>
                      {c.alreadyImported ? <span style={{ fontSize: 10, color: '#0F6E56', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ im CRM</span> : (c.matchedCrmId ? <span style={{ fontSize: 10, color: '#C9A96E', fontWeight: 600, whiteSpace: 'nowrap' }}>↔ Name-Match</span> : null)}
                    </label>
                  ))}
                  {!bmLoading && !filtered.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Keine Treffer.</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setModal(null)} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>Abbrechen</button>
                  <button onClick={doBillomatImport} disabled={bmBusy || !bmSel.size} className='btn-primary-anim' style={{ ...BTNP, padding: '8px 14px', fontSize: 12, opacity: (bmBusy || !bmSel.size) ? 0.6 : 1 }}>{bmBusy ? 'Importiert…' : `${bmSel.size} importieren`}</button>
                </div>
              </div>
            )
          })()}

          {/* DUPLIKATE */}
          {modal === 'duplicates' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, width: 660, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>🔁 Duplikate (Adresse + Datum)</span>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: 'var(--t3)' }}>
                <span>{dupLoading ? 'Sucht…' : `${dupGroups.length} Gruppe(n) · ${dupDel.size} zum Löschen`}</span>
                <span style={{ fontSize: 10 }}>✓ = neueste bleibt · markierte werden archiviert</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {dupLoading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Sucht Duplikate…</div>
                  : !dupGroups.length ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Keine Duplikate gefunden. 🎉</div>
                    : dupGroups.map((grp, gi) => (
                      <div key={gi} style={{ border: '0.5px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '7px 12px', background: 'var(--bg3)', fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>
                          {grp[0].card_date ? grp[0].card_date.split('-').reverse().join('.') : ''} · {grp[0].booking_address || grp[0].title} <span style={{ color: 'var(--t3)', fontWeight: 500 }}>({grp.length}×)</span>
                        </div>
                        {grp.map((c, ci) => {
                          const del = dupDel.has(c.id)
                          const keep = ci === 0
                          return (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderTop: '0.5px solid var(--brd2)', cursor: 'pointer', background: del ? 'rgba(185,28,28,.05)' : 'transparent' }}>
                              <input type="checkbox" checked={del} onChange={() => { const n = new Set(dupDel); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setDupDel(n) }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: del ? 'line-through' : 'none', color: del ? 'var(--t3)' : 'var(--t1)' }}>{c.title}</div>
                                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{c.client_name || '(kein Kunde)'} · geänd. {(c.updated_at || c.created_at || '').slice(0, 10).split('-').reverse().join('.')}</div>
                              </div>
                              {keep && !del && <span style={{ fontSize: 10, color: '#0F6E56', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ behalten</span>}
                            </label>
                          )
                        })}
                      </div>
                    ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setModal(null)} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>Abbrechen</button>
                <button onClick={applyDupDelete} disabled={dupBusy || !dupDel.size} style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (dupBusy || !dupDel.size) ? 0.6 : 1 }}>{dupBusy ? 'Löscht…' : `${dupDel.size} löschen`}</button>
              </div>
            </div>
          )}

          {/* KARTEN-KUNDEN REPARIEREN */}
          {modal === 'fix-clients' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, width: 640, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>🔧 Karten-Kunden reparieren</span>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                Vorschläge für Karten, deren Kunde fehlt oder nicht zum CRM passt (anhand Titel). Prüfe und übernimm nur die richtigen.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--t3)' }}>
                <span>{fixLoading ? 'Lädt…' : `${fixList.length} Vorschläge · ${fixSel.size} ausgewählt`}</span>
                {fixList.length > 0 && <button onClick={() => setFixSel(fixSel.size === fixList.length ? new Set() : new Set(fixList.map(p => p.cardId)))} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{fixSel.size === fixList.length ? 'Auswahl aufheben' : 'Alle'}</button>}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
                {fixLoading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Lädt…</div>
                  : !fixList.length ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Keine Vorschläge — alle Karten sind zugeordnet. 🎉</div>
                    : fixList.map(p => (
                      <label key={p.cardId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '0.5px solid var(--brd2)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={fixSel.has(p.cardId)} onChange={() => { const n = new Set(fixSel); n.has(p.cardId) ? n.delete(p.cardId) : n.add(p.cardId); setFixSel(n) }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{p.date ? p.date.split('-').reverse().join('.') + ' · ' : ''}{p.current ? <span style={{ textDecoration: 'line-through' }}>{p.current}</span> : '(kein Kunde)'} → <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{p.proposed}</span></div>
                        </div>
                      </label>
                    ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setModal(null)} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>Abbrechen</button>
                <button onClick={applyFixClients} disabled={fixBusy || !fixSel.size} className='btn-primary-anim' style={{ ...BTNP, padding: '8px 14px', fontSize: 12, opacity: (fixBusy || !fixSel.size) ? 0.6 : 1 }}>{fixBusy ? 'Speichert…' : `${fixSel.size} übernehmen`}</button>
              </div>
            </div>
          )}

          {/* MONATSABRECHNUNG */}
          {modal === 'monthly' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, width: 640, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>🗓️ Monatsabrechnung</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => { setMonthMode('month'); loadMonthly(monthSel || new Date().toISOString().slice(0, 7)) }}
                      style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: monthMode === 'month' ? 'var(--gold)' : 'var(--bg3)', color: monthMode === 'month' ? '#fff' : 'var(--t2)' }}>Monat</button>
                    <button onClick={() => { setMonthMode('client'); setMonthGroups([]); setMonthChecked(new Set()); loadMonthlyByClient(monthClientId) }}
                      style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: monthMode === 'client' ? 'var(--gold)' : 'var(--bg3)', color: monthMode === 'client' ? '#fff' : 'var(--t2)' }}>Kunde</button>
                  </div>
                  {monthMode === 'month'
                    ? <input type="month" value={monthSel} onChange={e => { setMonthSel(e.target.value); loadMonthly(e.target.value) }} style={{ ...IS, width: 'auto', padding: '6px 10px' }} />
                    : <select value={monthClientId} onChange={e => { setMonthClientId(e.target.value); loadMonthlyByClient(e.target.value) }} style={{ ...IS, width: 'auto', padding: '6px 10px', maxWidth: 240 }}>
                        <option value="">— Kunde wählen —</option>
                        {clients.filter(c => c.billomat_client_id).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')).map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.short_name ? ` (${c.short_name})` : ''}</option>
                        ))}
                      </select>}
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                {monthMode === 'month'
                  ? 'Pro Kunde eine Sammelrechnung (Entwurf) für den gewählten Monat. Bereits berechnete Karten sind markiert.'
                  : 'Alle Aufnahmen des Kunden — monatsübergreifend. Bereits berechnete sind markiert und können erneut abgerechnet werden.'}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {monthLoading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Lädt…</div>
                  : !monthGroups.length ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>{monthMode === 'client' ? (monthClientId ? 'Keine Aufnahmen für diesen Kunden.' : 'Wähle oben einen Kunden.') : 'Keine Aufnahmen in diesem Monat.'}</div>
                    : monthGroups.map((g, gi) => {
                      const linked = !!g.client?.billomat_client_id
                      const checkedCount = g.cards.filter(c => monthChecked.has(c.id)).length
                      const checkedSum = g.cards.filter(c => monthChecked.has(c.id)).reduce((s, c) => s + (parseFloat(priceForCard(c, g.client)) || 0), 0)
                      return (
                        <div key={gi} style={{ border: '0.5px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', background: 'var(--bg3)' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                              {!linked && <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 600 }}>{g.none ? '⚠ kein Kunde auf der Karte' : (g.client ? '⚠ nicht mit Billomat verknüpft' : '⚠ Kunde nicht im CRM')}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {checkedSum > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{checkedSum.toFixed(2)} €</span>}
                              <button onClick={() => monthlyCreateForClient(g)} disabled={!linked || !checkedCount} className='btn-primary-anim' style={{ ...BTNP, padding: '6px 11px', fontSize: 11, whiteSpace: 'nowrap', opacity: (!linked || !checkedCount) ? 0.5 : 1 }}>🧾 Rechnung ({checkedCount})</button>
                            </div>
                          </div>
                          <div>
                            {g.cards.map(c => {
                              const on = monthChecked.has(c.id)
                              return (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderTop: '0.5px solid var(--brd2)', cursor: 'pointer' }}>
                                  <input type="checkbox" checked={on} onChange={() => { const n = new Set(monthChecked); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setMonthChecked(n) }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(findType(getTypes(photoCats), c.card_type)?.l || c.card_type)} · {c.booking_address || c.title}</div>
                                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{c.card_date ? c.card_date.split('-').reverse().join('.') : ''}</div>
                                  </div>
                                  {c.billed_at && <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d', background: '#dcfce7', border: '0.5px solid #86efac', borderRadius: 8, padding: '1px 6px', whiteSpace: 'nowrap' }}>✓ berechnet</span>}
                                  {(() => { const rp = priceForCard(c, g.client); return <span style={{ fontSize: 11, color: rp > 0 ? 'var(--gold)' : 'var(--t3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{rp > 0 ? rp + ' €' : '— €'}</span> })()}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={() => setModal(null)} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>Schließen</button>
              </div>
            </div>
          )}

          {/* RECHNUNG (ENTWURF) */}
          {modal === 'invoice' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, width: 600, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>🧾 Neue Rechnung (Entwurf){invClient?.name ? ' — ' + invClient.name : ''}</span>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>

              {invResult ? (
                <div style={{ padding: '8px 2px' }}>
                  <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 10 }}>✅ Entwurf in Billomat erstellt (Billomat-ID <b>#{invResult.invoice_id}</b>).</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.5 }}>
                    Die Rechnung ist als <b>Entwurf</b> angelegt — sie hat noch <b>keine</b> Rechnungsnummer.
                    Öffne sie in Billomat unter <b>Rechnungen → Entwürfe</b>, prüfe sie und <b>schließe sie ab</b> (dann wird Nummer + PDF erzeugt).
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => {
                      const items = invItems.filter(it => (it.title || '').trim() || it.unit_price).map(it => ({ description: [it.title, it.description].filter(Boolean).join('\n'), qty: it.quantity || 1, unit_price: it.unit_price || '', discount: '', vat_rate: 19 }))
                      const pf = { client_name: invClient?.short_name || invClient?.name || '', client_id: invClient?.id || null, invoice_date: new Date().toISOString().slice(0, 10), items: items.length ? items : undefined }
                      try { localStorage.setItem('ip-invoice-prefill', JSON.stringify(pf)) } catch {}
                      window.location.href = '/rechnungen/neu'
                    }} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>🧾 Im CRM-Rechnungseditor öffnen</button>
                    <button onClick={() => window.open('https://cristiandina.billomat.net/app/invoices/', '_blank')} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>↗ In Billomat öffnen</button>
                    <button onClick={() => setModal(null)} className='btn-primary-anim' style={{ ...BTNP, padding: '8px 14px', fontSize: 12 }}>Schließen</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Frühere Positionen */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>Frühere Positionen {invHistLoading ? '(lädt…)' : invHist.length ? `(${invHist.length})` : '(keine)'}</div>
                    {invHist.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 96, overflowY: 'auto' }}>
                        {invHist.map((h, i) => (
                          <button key={i} type="button" onClick={() => invAddItem({ title: h.title, quantity: 1, unit_price: h.unit_price, unit: h.unit })} title={'zuletzt: ' + (h.last_date || '—')}
                            style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 7, padding: '5px 9px', fontSize: 11, color: 'var(--t2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{h.title}</span>
                            <span style={{ color: 'var(--gold)' }}>{h.unit_price ? (parseFloat(h.unit_price).toFixed(2) + ' €') : ''}</span>
                            <span style={{ color: 'var(--t3)' }}>+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Positionen */}
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 88px 26px', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--t3)', padding: '0 2px 4px' }}>
                      <span>Bezeichnung (Datum - Kunde - Adresse)</span><span>Menge</span><span>Einzelpr. €</span><span></span>
                    </div>
                    {invItems.map((it, i) => (
                      <div key={i} style={{ border: '0.5px solid var(--brd2)', borderRadius: 8, padding: 6, marginBottom: 7 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 88px 26px', gap: 6, alignItems: 'center' }}>
                          <input value={it.title || ''} onChange={e => invSetItem(i, 'title', e.target.value)} placeholder="Datum - Kunde - Adresse" style={{ ...IS, padding: '7px 9px' }} />
                          <input value={it.quantity ?? 1} onChange={e => invSetItem(i, 'quantity', e.target.value)} inputMode="decimal" style={{ ...IS, padding: '7px 6px' }} />
                          <input value={it.unit_price ?? ''} onChange={e => invSetItem(i, 'unit_price', e.target.value)} inputMode="decimal" placeholder="0.00" style={{ ...IS, padding: '7px 6px' }} />
                          <button type="button" onClick={() => invDelItem(i)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                        <input value={it.description || ''} onChange={e => invSetItem(i, 'description', e.target.value)} placeholder="Leistung — z.B. Immobilienfotografie + Postproduktion" style={{ ...IS, padding: '6px 9px', marginTop: 5, fontSize: 11, color: 'var(--t2)' }} />
                      </div>
                    ))}
                    <button type="button" onClick={() => invAddItem()} style={{ ...BTNG, padding: '5px 10px', fontSize: 11, marginTop: 2 }}>+ Position</button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={LS}>Notiz (optional)</label>
                    <input value={invNote} onChange={e => setInvNote(e.target.value)} placeholder="z.B. Objekt / Adresse" style={IS} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>Erstellt nur einen Entwurf — finalisiert wird in Billomat.</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => window.open('https://cristiandina.billomat.net/app/invoices/', '_blank')} style={{ ...BTNG, padding: '8px 12px', fontSize: 12 }}>↗ Billomat</button>
                      <button onClick={() => setModal(null)} style={{ ...BTNG, padding: '8px 14px', fontSize: 12 }}>Abbrechen</button>
                      <button onClick={createInvoice} disabled={invBusy} className='btn-primary-anim' style={{ ...BTNP, padding: '8px 14px', fontSize: 12, opacity: invBusy ? 0.6 : 1 }}>{invBusy ? 'Erstellt…' : 'Entwurf erstellen'}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* NEW CARD */}
          {modal === 'new-card' && (
            <form onSubmit={async e => { e.preventDefault(); if(submitting) return; setSubmitting(true); await createCard(new FormData(e.target)); setSubmitting(false); broadcastChange('cards_changed') }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 22, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>+ Neue Karte</span>
                <button type="button" onClick={() => {
                  const titleEl = document.getElementById('nc-title')
                  if (titleEl?.value?.trim()) {
                    if (!window.confirm('Karte nicht gespeichert. Wirklich schließen?')) return
                  }
                  setModal(null)
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 13 }}>
                {Object.entries(getTypes(photoCats)).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setCardType(k)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid ' + (cardType === k ? v.c : 'var(--brd2)'), background: cardType === k ? v.bg : 'none', color: cardType === k ? v.c : 'var(--t3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {v.l}
                  </button>
                ))}
              </div>
              <input type="hidden" name="cardtype" value={cardType} />
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Kunde</label>
                <input name="client" list="cl-list" placeholder="z.B. Casalie, Bartz..." style={IS} onChange={e => { const t=document.getElementById('nc-title'); if(t && (!t.value || t.dataset.autofilled==='1')) { t.value = e.target.value ? e.target.value + ' - ' : ''; t.dataset.autofilled='1' } }} />
                <datalist id="cl-list">{clients.map(c => <option key={c.id} value={c.short_name || c.name} />)}</datalist>
              </div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Titel / Adresse *</label>
                <input id="nc-title" name="title" placeholder="z.B. Müller - Hauptstr. 5" style={IS} />
              </div>
              {cardType !== 'todo' && (
                <>
                  <div style={{ marginBottom: 9 }}>
                    <label style={LS}>Adresse (Straße, Stadt)</label>
                    <input name="addr" id="nc-addr-input" placeholder="z.B. Hauptstraße 5, 68159 Mannheim" style={IS}
                  ref={el => {
                    if (!el || el._ac) return
                    const initAC = () => {
                      if (!window.google?.maps?.places) return
                      el._ac = true
                      const ac = new window.google.maps.places.Autocomplete(el, {
                        types: ['address'], componentRestrictions: { country: 'de' }
                      })
                      ac.addListener('place_changed', () => {
                        const p = ac.getPlace()
                        if (p.formatted_address) {
                          el.value = p.formatted_address
                          // Trigger React onChange event
                          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
                          nativeInputValueSetter.call(el, p.formatted_address)
                          el.dispatchEvent(new Event('input', { bubbles: true }))
                        }
                      })
                    }
                    if (window.google?.maps?.places) initAC()
                    else window.addEventListener('google-maps-loaded', initAC, { once: true })
                  }} />
                  </div>
                  <div style={{ marginBottom: 9 }}>
                    <label style={LS}>Datum & Uhrzeit</label>
                    <input type="hidden" name="date" value={ncDate||''} />
                    <input type="hidden" name="time" value={ncTime||''} />
                    <input type="hidden" name="time_to" value={ncTimeTo||''} />
                    <DateTimePicker date={ncDate} time={ncTime} timeTo={ncTimeTo} onDateChange={setNcDate} onTimeChange={setNcTime} onTimeToChange={setNcTimeTo} />
                  </div>
                </>
              )}
              {cardType === 'todo' && (
                <div style={{ marginBottom: 9 }}>
                  <label style={LS}>Fälligkeitsdatum</label>
                  <input type="hidden" name="date" value={ncDate||''} />
                  <input type="hidden" name="time" value={ncTime||''} />
                  <DateTimePicker date={ncDate} time={ncTime} timeTo={ncTimeTo} onDateChange={setNcDate} onTimeChange={setNcTime} onTimeToChange={setNcTimeTo} />
                </div>
              )}
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Beschreibung / Notiz</label>
                <div style={{ position:'relative' }}>
                  <textarea name="desc" id="nc-beschreibung" rows={2} placeholder="@name taggeléshez írj @-t" style={{ ...IS, resize: 'none' }}
                    onChange={e => {
                      const val = e.target.value; const pos = e.target.selectionStart
                      const before = val.slice(0,pos); const atIdx = before.lastIndexOf('@')
                      if (atIdx>=0 && !before.slice(atIdx+1).includes(' ')) {
                        setDescMention({ query:before.slice(atIdx+1), pos:atIdx, show:true })
                      } else { setDescMention(p=>({...p,show:false})) }
                    }}
                    onKeyDown={e=>{ if(e.key==='Escape') setDescMention(p=>({...p,show:false})) }}
                    onBlur={()=>setTimeout(()=>setDescMention(p=>({...p,show:false})),150)}
                  />
                  {descMention.show && (
                    <MentionDropdown query={descMention.query} staff={staff} style={{ bottom:'100%', left:0 }}
                      onSelect={s => {
                        const ta = document.getElementById('nc-beschreibung')
                        if (!ta) return
                        const before = ta.value.slice(0, descMention.pos)
                        const after = ta.value.slice(ta.selectionStart)
                        ta.value = before + '@' + s.name + ' ' + after
                        setDescMention(p=>({...p,show:false}))
                        ta.focus()
                      }}
                    />
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Team</label>
                <div id="nc-team" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                  {staff.map(s => (
                    <div key={s.id} data-p={s.init} className="chip" onClick={e => e.currentTarget.classList.toggle('on')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 4px', fontSize: 12, fontWeight: 600, color: 'var(--t2)', cursor: 'pointer' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                        {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                      </div>
                      {s.name.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={LS}>Spalte</label>
                <select name="col" style={IS} defaultValue={newCardColId ? cols.findIndex(c => c.id === newCardColId) : 0}>{cols.map((c, i) => <option key={c.id} value={i}>{c.title}</option>)}</select>
              </div>
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(null)} style={BTNG}>Abbrechen</button>
                <button type="submit" disabled={submitting} style={{ ...BTNP, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? 'Wird erstellt...' : '+ Erstellen'}</button>
              </div>
            </form>
          )}

          {/* NEW COLUMN */}
          {modal === 'new-col' && (
            <form onSubmit={e => { e.preventDefault(); createCol(new FormData(e.target)) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 22, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>+ Neue Spalte</span>
                <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>
              <div style={{ marginBottom: 11 }}>
                <label style={LS}>Name</label>
                <input name="name" required placeholder="z.B. Qualitätskontrolle" style={IS} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={LS}>Farbe</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                  {COLORS.map(c => <div key={c} onClick={() => setNewColColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', outline: newColColor === c ? '3px solid var(--t1)' : 'none', outlineOffset: 2 }} />)}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 7, alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: 'var(--t3)' }}>Benutzerdefiniert:</label>
                  <input type="color" value={newColColor} onChange={e => setNewColColor(e.target.value)} style={{ width: 30, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(null)} style={BTNG}>Abbrechen</button>
                <button type="submit" style={BTNP}>Erstellen</button>
              </div>
            </form>
          )}

          {/* DUPLIKATE */}
          {clientDupModal && (
            <div className="modal-animate" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 13, padding: 22, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>🔍 Mögliche Duplikate</span>
                <button onClick={() => setClientDupModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t3)' }}>×</button>
              </div>
              {clientDupGroups.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>✓ Keine Duplikate gefunden — alle Kunden sind eindeutig.</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 14 }}>{clientDupGroups.length} Gruppe(n) mit ähnlichen Namen gefunden. Öffne ein Profil zum Zusammenführen.</div>
                  {clientDupGroups.map((g, gi) => (
                    <div key={gi} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 12, marginBottom: 10, background: 'var(--bg3)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#b3402f', marginBottom: 8 }}>⚠️ {g.length} ähnliche Einträge:</div>
                      {g.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '0.5px solid var(--border)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.kundennr || 'keine Kd-Nr.'}{c.addr ? ' · ' + c.addr.split(',').pop().trim() : ''}</div>
                          </div>
                          <a href={'/kunden/' + c.id} style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none', border: '1px solid var(--gdbr)', borderRadius: 6, padding: '4px 10px' }}>Profil öffnen →</a>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>Tipp: Im Profil → „zusammenführen" überträgt Rechnungen + Karten und löscht den Doppel-Eintrag.</div>
                </>
              )}
            </div>
          )}

          {/* CLIENT */}
          {modal === 'client' && (
            <form onSubmit={e => { e.preventDefault(); saveClient(new FormData(e.target)) }} className="modal-animate" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 13, padding: 22, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:'rgba(123,191,203,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-user-plus" style={{ fontSize:16, color:'#2a6a7a' }}></i>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{editClient ? 'Kunde bearbeiten' : 'Neuer Kunde'}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {me?.can_invoice && editClient?.billomat_client_id && (
                    <button type="button" onClick={() => openInvoice(editClient)} style={{ ...BTNG, padding:'5px 11px', fontSize:12 }}>🧾 Neue Rechnung</button>
                  )}
                  <button type="button" onClick={() => { setModal(null); setEditClient(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Firmenname *</label><input name="name" required defaultValue={editClient?.name || ''} style={IS} /></div>
                <div><label style={LS}>Kürzel (Kalender)</label><input name="short_name" defaultValue={editClient?.short_name || ''} placeholder="z.B. EV-Kl" style={IS} /></div>
              </div>
              <div style={{ marginBottom: 9 }}><label style={LS}>Kundennummer</label><input name="kundennr" defaultValue={editClient?.kundennr || ''} placeholder={editClient?.id ? '' : 'wird automatisch vergeben (z.B. KD189)'} style={IS} /><div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Leer lassen → automatisch die nächste freie Nummer. Beim Re-Import alte Nummer eintragbar.</div></div>
              <div style={{ marginBottom: 9 }}><label style={LS}>Rechnungsadresse</label><input name="addr" defaultValue={editClient?.addr || ''} style={IS} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Email (Firma)</label><input name="email" type="email" defaultValue={editClient?.email || ''} style={IS} /></div>
                <div><label style={LS}>Telefon (Firma)</label><input name="tel" defaultValue={editClient?.tel || ''} style={IS} /></div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 7, marginTop: 4, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>Ansprechpartner</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Vorname</label><input name="contact_firstname" defaultValue={editClient?.contact_firstname || ''} style={IS} /></div>
                <div><label style={LS}>Nachname</label><input name="contact_lastname" defaultValue={editClient?.contact_lastname || ''} style={IS} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Telefon</label><input name="contact_tel" defaultValue={editClient?.contact_tel || ''} style={IS} /></div>
                <div><label style={LS}>Telefon 2</label><input name="contact_tel2" defaultValue={editClient?.contact_tel2 || ''} style={IS} /></div>
              </div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>E-Mail</label>
                <input name="contact_email" type="email" defaultValue={editClient?.contact_email || ''} style={IS} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 7, marginTop: 4, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
                <i className="ti ti-brand-dropbox" style={{ fontSize: 12, color: '#0061fe', marginRight: 4 }} />
                Dropbox Upload-Ordner
              </div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Dropbox Link</label>
                <input name="dropbox_link" defaultValue={editClient?.dropbox_link || ''} placeholder="https://www.dropbox.com/request/..." style={IS} />
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>Erscheint auf Karten als direkter Upload-Button</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
                <div><label style={LS}>USt-ID</label><input name="vat" defaultValue={editClient?.vat || ''} style={IS} /></div>
                <div><label style={LS}>Externer Link (z.B. Trello)</label><input name="extra_link" type="url" placeholder="https://..." defaultValue={editClient?.extra_link || ''} style={IS} /></div>
                <div><label style={LS}>Kategorie</label>
                  <select name="cat" defaultValue={editClient?.category || 'Maklerunternehmen'} style={IS}>
                    {clientCats.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={LS}>Farbe</label>
                <input type="hidden" name="client_color" value={clientColorState} onChange={()=>{}} />
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 5 }}>
                  {[
                    { key:'', color:'#fff', noColor:true },
                    { key:'peach', color:'#FFBE98' }, { key:'mocha', color:'#A67B5B' },
                    { key:'ciel', color:'#7BBFCB' }, { key:'apricot', color:'#E8A87C' },
                    { key:'sage', color:'#9CAF88' }, { key:'artgold', color:'#C9A96E' },
                    { key:'granite', color:'#B5C4B1' }, { key:'rose', color:'#D4A5A5' },
                    { key:'cerulean', color:'#A8C5DA' }, { key:'slate', color:'#6B7C93' },
                    { key:'caramel', color:'#C4956A' }, { key:'laurel', color:'#8FA68E' },
                    { key:'flamingo', color:'#D4869B' }, { key:'steel', color:'#7B9EA6' },
                  ].map(col => (
                    <div key={col.key} title={col.key || 'Keine Farbe'}
                      onClick={() => setClientColorState(col.key)}
                      data-ckey={col.key} className="client-color-dot"
                      style={{ width:22, height:22, borderRadius:'50%', background:col.color, border:'1.5px solid '+(col.noColor?'#ccc':col.color), cursor:'pointer', position:'relative', flexShrink:0, transition:'transform .18s cubic-bezier(.34,1.56,.64,1)', boxShadow: clientColorState===(col.key) ? '0 0 0 2.5px #fff, 0 0 0 4.5px '+(col.noColor?'#888':col.color) : 'none' }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                      {col.noColor && <div style={{ position:'absolute', top:'50%', left:'50%', width:'130%', height:'1.5px', background:'#e74c3c', transform:'translate(-50%,-50%) rotate(-45deg)', borderRadius:1 }} />}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Makler</div>
              {/* PREISE ACCORDION — csak admin + subadmin */}
              {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && <div style={{ marginBottom:12 }}>
                <div onClick={()=>setPriceAccordion(p=>p?null:'open')} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background: priceAccordion ? 'rgba(184,137,42,.06)' : 'var(--bg3)', border:'0.5px solid var(--border)', borderRadius: priceAccordion ? '8px 8px 0 0' : 8, cursor:'pointer', userSelect:'none', transition:'background .15s' }}>
                  <i className="ti ti-currency-euro" style={{ fontSize:13, color:'var(--gold)' }} />
                  <span style={{ fontSize:12, fontWeight:700, color: priceAccordion ? 'var(--gold)' : 'var(--t1)', flex:1 }}>Preise</span>
                  {!priceAccordion && editClient?.service_prices && (
                    <span style={{ fontSize:10, color:'var(--t3)', background:'var(--bg2)', padding:'2px 7px', borderRadius:10 }}>
                      {Object.values(editClient.service_prices).filter(Boolean).length} eingetragen
                    </span>
                  )}
                  <i className={'ti ' + (priceAccordion ? 'ti-chevron-up' : 'ti-chevron-down')} style={{ fontSize:12, color:'var(--t3)' }} />
                </div>
                {priceAccordion && (
                  <div style={{ border:'0.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 8px 8px', padding:'12px 12px 10px', background:'var(--bg2)' }}>
                    <ClientPriceEditor
                      servicePrices={servicePrices}
                      clientPrices={editClient?.service_prices || {}}
                      onChange={prices => {
                        setClientSpJson(JSON.stringify(prices))
                      }}
                    />
                    <input type="hidden" name="service_prices_json" value={clientSpJson} readOnly />
                  </div>
                )}
              </div>
              }<MaklerEditor clientId={editClient?.id} maklers={maklers} onReload={loadMaklers} phonebook={phonebook} />
              {editClient?.short_name && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3, display:'block' }}>Öffentlicher Kalender (nur Ansicht)</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 10px' }}>
                    <i className="ti ti-calendar-share" style={{ fontSize:14, color:'var(--gold)' }} />
                    <span style={{ flex:1, fontSize:12, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(typeof window!=='undefined'?window.location.origin:'')}/cal/{editClient.short_name}</span>
                    <button type="button" onClick={()=>{ const url=window.location.origin+'/cal/'+editClient.short_name; navigator.clipboard?.writeText(url); alert('Link kopiert:\n'+url) }}
                      style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>Kopieren</button>
                  </div>
                  <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>Zeigt nur die Aufnahmen dieses Kunden — schreibgeschützt, ohne Login.</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                {editClient && <button type="button" onClick={() => deleteClientFn(editClient.id)} style={BTNR}>🗑 Löschen</button>}
                <button type="button" onClick={() => { setModal(null); setEditClient(null) }} style={BTNG}>Abbrechen</button>
                {isAdminOrSub && <button type="submit" style={BTNP}>✓ Speichern</button>}
              </div>
            </form>
          )}

          {/* STAFF */}
          {modal === 'staff' && (
<form onSubmit={e => { e.preventDefault(); if(isAdminOrSub) saveStaffFn(new FormData(e.target)) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 22, width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{editStaff?.id ? '✏️ Mitarbeiter' : '+ Mitarbeiter'}</span>
                <button type="button" onClick={() => { setModal(null); setEditStaff(null); setStaffAvatarData(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <label style={{ cursor: 'pointer' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 6px', background: (editStaff?._color||editStaff?.color||'#6b6b6e')+'22', border: '4px solid '+(editStaff?._color||editStaff?.color||'#6b6b6e'), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 20, fontWeight: 700, color: editStaff?._color||editStaff?.color||'var(--t3)', transition:'border-color .2s,background .2s' }}>
                    {staffAvatarData ? <img src={staffAvatarData} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : editStaff?.avatar_url ? <img src={editStaff.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editStaff?.init || '📷')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Profilbild</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Name *</label><input name="name" required defaultValue={editStaff?.name || ''} style={IS} /></div>
                <div><label style={LS}>Kürzel</label><input name="init" maxLength={3} defaultValue={editStaff?.init || ''} placeholder="CD" style={IS} /></div>
              </div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Rolle</label>
                <select name="role" defaultValue={editStaff?.role || ''} style={IS}>
                  {(staffRoles?.length ? staffRoles : ['Fotograf','Videograf / Cutter','Drohnen Pilot','Backoffice','Social Media','Leiter / Fotograf']).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                <div><label style={LS}>Email</label><input name="email" type="email" defaultValue={editStaff?.email || ''} style={IS} /></div>
                {isAdminOrSub && me?.role_level==='admin' && editStaff?.id !== me?.id && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LS}>Zugriffsrecht</label>
                    <select name="role_level" defaultValue={editStaff?.role_level||'mitarbeiter'} style={IS}>
                      <option value="demo">Demo — Nur lesen, keine Änderungen</option>
                      <option value="marketing">Marketing — Nur Marketing-Board</option>
                      <option value="mitarbeiter">Mitarbeiter — Nur eigenes Profil</option>
                      <option value="subadmin">Subadmin — Kunden + Mitarbeiter verwalten</option>
                      <option value="admin">Admin — Vollzugriff</option>
                    </select>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>
                      ⚠ Nur du als Admin kannst Zugriffsrechte vergeben
                    </div>
                  </div>
                )}
                {me?.role_level==='admin' && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LS}>Rechnungs-Modul</label>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer', color:'var(--t1)', padding:'8px 10px', background:'var(--bg3)', borderRadius:7, border:'0.5px solid var(--border)' }}>
                      <input type="checkbox" name="can_invoice" defaultChecked={!!editStaff?.can_invoice} />
                      <span>🧾 Zugriff auf Rechnungen &amp; Umsatz (Abrechnungsbereich)</span>
                    </label>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>Nur Personen mit diesem Recht sehen den Abrechnungsbereich (z. B. du, Subadmin, Steuerberater).</div>
                  </div>
                )}
                {me?.role_level==='admin' && boards.length > 0 && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LS}>Board-Zugriff</label>
                    <div style={{ display:'flex', gap:14, flexWrap:'wrap', padding:'6px 10px', background:'var(--bg3)', borderRadius:7, border:'0.5px solid var(--border)' }}>
                      {boards.map(b => {
                        const current = editStaff?._allowed_boards !== undefined ? editStaff._allowed_boards : (editStaff?.allowed_boards || [])
                        const on = current.includes(b.id)
                        return (
                          <label key={b.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', color:'var(--t1)' }}>
                            <input type="checkbox" checked={on} onChange={e=>{
                              const next = e.target.checked ? [...new Set([...current, b.id])] : current.filter(x=>x!==b.id)
                              setEditStaff({ ...editStaff, _allowed_boards: next })
                            }} />
                            <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:b.color||'#6b6b6e' }} />
                            {b.name}
                          </label>
                        )
                      })}
                    </div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>
                      Welche Boards darf dieser Mitarbeiter sehen?
                    </div>
                  </div>
                )}
                <div><label style={LS}>Telefon</label><input name="tel" defaultValue={editStaff?.tel || ''} style={IS} /></div>
                <div><label style={LS}>Geburtstag</label><input name="birthday" type="date" defaultValue={editStaff?.birthday || ''} style={IS} /></div>
              </div>
              <div style={{ marginBottom: 9 }}><label style={LS}>GCal ID</label><input name="cal" defaultValue={editStaff?.cal_id || ''} style={IS} /></div>
              <div style={{ marginBottom: 9 }}><label style={LS}>Passwort {editStaff?.id ? '(leer = unverändert)' : ''}</label><input name="password" type="password" placeholder={editStaff?.id ? '••••••••' : 'Passwort setzen'} autoComplete="new-password" style={IS} /></div>
              <div style={{ marginBottom: 9 }}>
                <label style={LS}>Adresse (Heimadresse)</label>
                <input name="address" id="staff-address-input" defaultValue={editStaff?.address || ''} placeholder="Straße, PLZ Stadt" style={IS}
                  ref={el => {
                    if(el && window.google?.maps?.places && !el._acInit) {
                      el._acInit = true
                      const ac = new window.google.maps.places.Autocomplete(el, { types:['address'], componentRestrictions:{country:'de'} })
                      ac.addListener('place_changed', () => {
                        const place = ac.getPlace()
                        if(place?.formatted_address) el.value = place.formatted_address
                      })
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={LS}>Farbe</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  {COLORS.map(col => (
                    <div key={col} onClick={() => setEditStaff(s => ({ ...s, _color: col }))} style={{ width: 20, height: 20, borderRadius: '50%', background: col, cursor: 'pointer', outline: (editStaff?._color || editStaff?.color || '#6b6b6e') === col ? '3px solid var(--t1)' : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--t3)' }}>Egyedi szín:</label>
                  <input type="color" value={editStaff?._color || editStaff?.color || '#6b6b6e'} onChange={e => setEditStaff(s => ({ ...s, _color: e.target.value }))} style={{ width: 32, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace' }}>{editStaff?._color || editStaff?.color || '#6b6b6e'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                {editStaff?.id && (me?.role_level==='admin'||me?.role_level==='subadmin') && <button type="button" onClick={() => deleteStaffFn(editStaff.id)} style={BTNR}><i className="ti ti-trash" style={{fontSize:12,marginRight:4}}/>Löschen</button>}
                <button type="button" onClick={() => { setModal(null); setEditStaff(null); setStaffAvatarData(null) }} style={BTNG}>Abbrechen</button>
                <button type="submit" style={BTNP}>✓ Speichern</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* CUSTOM WIDGET MODAL */}
      {customWidgetModal && (
        <div onClick={e=>{if(e.target===e.currentTarget)setCustomWidgetModal(false)}} style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:13, padding:22, width:480, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,.12)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:15, fontWeight:700 }}>🧩 Eigenes Widget</span>
              <button onClick={()=>setCustomWidgetModal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:17, color:'var(--t3)' }}>✕</button>
            </div>
            {me?.role_level==='admin' && (
              <button onClick={()=>{
                const exists = widgets.find(w=>w.type==='makler')
                if (exists) saveWidgets(widgets.map(w=>w.type==='makler'?{...w,open:true}:w))
                else saveWidgets([...widgets, { id:'makler', type:'makler', x:120, y:100, w:260, h:300, open:true }])
                setCustomWidgetModal(false)
              }} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 12px', marginBottom:14, background:'var(--gdbg)', border:'1px solid var(--gold)', borderRadius:9, cursor:'pointer', color:'var(--gold)', fontSize:13, fontWeight:700 }}>
                <i className="ti ti-building-community" style={{ fontSize:16 }} /> Makler-Monatsliste hinzufügen (nur für dich)
              </button>
            )}
            {widgets.filter(w=> !(w.type==='makler' && me?.role_level!=='admin')).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <label style={LS}>Widgets ein-/ausschalten</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:6 }}>
                  {widgets.filter(w=> !(w.type==='makler' && me?.role_level!=='admin')).map(w => {
                    const on = !w.disabled
                    const label = w.title || ({weather:'Wetter',todo:'To Do',nexttermin:'Nächster Termin',stats:'Statistik',makler:'Makler / Monat'}[w.type]) || w.type
                    return (
                      <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--bg3)', borderRadius:8 }}>
                        <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{label}</span>
                        <button onClick={()=>saveWidgets(widgets.map(ww=>ww.id===w.id?{...ww, disabled:on, open: on ? ww.open : true }:ww))}
                          title={on?'Ausschalten':'Einschalten'}
                          style={{ width:42, height:22, borderRadius:12, border:'none', cursor:'pointer', background:on?'var(--gold)':'var(--border)', position:'relative', transition:'background .15s', flexShrink:0 }}>
                          <span style={{ position:'absolute', top:2, left:on?22:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s' }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <label style={LS}>Widget-Titel</label>
              <input value={customWidgetForm.title} onChange={e=>setCustomWidgetForm(p=>({...p,title:e.target.value}))} placeholder="z.B. Mein Dashboard" style={IS}/>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={LS}>Typ</label>
              <div style={{ display:'flex', gap:7, marginTop:4 }}>
                {['iframe','html'].map(t=>(
                  <button key={t} onClick={()=>setCustomWidgetForm(p=>({...p,type:t}))}
                    style={{ padding:'5px 14px', borderRadius:6, border:'1.5px solid '+(customWidgetForm.type===t?'var(--gold)':'var(--border)'), background:customWidgetForm.type===t?'var(--gdbg)':'none', color:customWidgetForm.type===t?'var(--gold)':'var(--t3)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {t==='iframe'?'🌐 iFrame':'💻 HTML'}
                  </button>
                ))}
              </div>
            </div>
            {customWidgetForm.type==='iframe' && (
              <div style={{ marginBottom:14 }}>
                <label style={LS}>URL</label>
                <input value={customWidgetForm.url} onChange={e=>setCustomWidgetForm(p=>({...p,url:e.target.value}))} placeholder="https://..." style={IS}/>
              </div>
            )}
            {customWidgetForm.type==='html' && (
              <div style={{ marginBottom:14 }}>
                <label style={LS}>HTML Code</label>
                <textarea value={customWidgetForm.html} onChange={e=>setCustomWidgetForm(p=>({...p,html:e.target.value}))} rows={5} placeholder="<div>Dein HTML hier...</div>" style={{...IS, resize:'vertical', fontFamily:'monospace', fontSize:12}}/>
              </div>
            )}
            <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
              <button onClick={()=>setCustomWidgetModal(false)} style={BTNG}>Abbrechen</button>
              <button onClick={()=>{
                if(!customWidgetForm.title.trim()) return
                if(customWidgetForm.editId) {
                  saveWidgets(widgets.map(ww => ww.id===customWidgetForm.editId ? {...ww, title:customWidgetForm.title, type:customWidgetForm.type, url:customWidgetForm.url, html:customWidgetForm.html} : ww))
                } else {
                  const newW = { id:'custom-'+Date.now(), type:customWidgetForm.type, title:customWidgetForm.title, url:customWidgetForm.url, html:customWidgetForm.html, x:100, y:100, w:340, h:280, open:true }
                  saveWidgets([...widgets, newW])
                }
                setCustomWidgetModal(false)
                setCustomWidgetForm({title:'',type:'iframe',url:'',html:''})
              }} style={BTNP}>{customWidgetForm.editId ? '✓ Speichern' : '+ Erstellen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {sendModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setSendModal(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 22, width: 500, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>📤 Shooting senden</span>
              <button onClick={() => setSendModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--t3)' }}>✕</button>
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={LS}>Kunde email</label>
                {sendModal.emailOptions?.length > 1 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:7 }}>
                    {sendModal.emailOptions.map((opt, i) => (
                      <button key={i} type="button" onClick={() => setSendModal(p => ({ ...p, clientEmail: opt.email }))}
                        style={{ padding:'4px 10px', borderRadius:6, border:'1.5px solid '+(sendModal.clientEmail===opt.email?'var(--gold)':'var(--border)'), background:sendModal.clientEmail===opt.email?'var(--gdbg)':'none', color:sendModal.clientEmail===opt.email?'var(--gold)':'var(--t2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                <input value={sendModal.clientEmail} onChange={e => setSendModal(p => ({ ...p, clientEmail: e.target.value }))} style={IS} />
              </div>
            <div style={{ marginBottom: 10 }}><label style={LS}>Drive / Dropbox Link</label><input value={sendModal.link} onChange={e => setSendModal(p => ({ ...p, link: e.target.value }))} placeholder="https://drive.google.com/..." style={IS} /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Vorlage</label>
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                {[1, 2, 3].map(n => (
                  <button key={n} type="button" onClick={() => setSendModal(p => ({ ...p, template: n }))} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid ' + (sendModal.template === n ? 'var(--gold)' : 'var(--border)'), background: sendModal.template === n ? 'var(--gdbg)' : 'none', color: sendModal.template === n ? 'var(--gold)' : 'var(--t3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Vorlage {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <button onClick={() => setSendModal(null)} style={BTNG}>Abbrechen</button>
              <button onClick={sendShooting} style={BTNP}>📤 E-Mail öffnen</button>
            </div>
          </div>
        </div>
      )}

      {showCrop && <AvatarCrop initialSrc={staffAvatarData} onDone={data => { setStaffAvatarData(data); setShowCrop(false) }} onCancel={() => setShowCrop(false)} />}


      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.25 } }
        .chip.on { background:var(--gdbg)!important; border-color:var(--gdbr)!important; color:var(--gold)!important }
        .chat-msg:hover .reply-btn { opacity:1!important }
        .card-hover-menu { display:none !important }
        .board-card:hover .card-hover-menu { display:flex !important }
      `}</style>
      <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents:'all' }}>
            <NotifToast n={t} staff={staff} onOpen={openCardFromNotification} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ClientAvatar({ cl, favicon, initials }) {
  const [err, setErr] = React.useState(false)
  const sz = 26
  const color = cl?.color || '#6b6b6e'
  if (favicon && !err) {
    return <img src={favicon} onError={() => setErr(true)} style={{ width: sz, height: sz, borderRadius: 6, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', flexShrink: 0 }} alt="" />
  }
  return <div style={{ width: sz, height: sz, borderRadius: 6, background: color + '1f', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, border: '1px solid ' + color + '33' }}>{initials}</div>
}

function StaffAv({ id, size = 20, staff = [], fontSize = 14 }) {
  const s = staff?.find(x => x.id === id) || {}
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: (s.color||'#6b6b6e') + '22', color: s.color||'#6b6b6e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size < 22 ? 7 : 9, fontWeight: 700, border: '2px solid var(--bg2)', overflow: 'hidden', flexShrink: 0 }}>
      {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (s.init || '?')}
    </div>
  )
}

function ClaudeAvatar({ size = 28 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f5e6df', padding: size*0.12 }}>
      <img src={CLAUDE_SVG} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="Claude" />
    </div>
  )
}

function CardItem({ card, staff, border, overdueDays = 0, overdueBg, onNoteChange, onNoteEnter, onClick, onDragStart, onSend, onCheck, onDelete, onColorChange, droppedId, noteMention, setNoteMention, dirtyCards, editingCards, onMoveUp, onMoveDown, onlineUsers, fontSize = 14, dragging = null, clients = [], allTypes = null, hideNotSentBadge = false, compact = false, onCompactToggle = null }) {
  const t = TYPES[card.card_type] || TYPES.foto
  const done = (card.checklist_items || []).filter(x => x.done).length
  const tot = (card.checklist_items || []).length
  const [noteVal, setNoteVal] = useState(card.note || '')
  useEffect(() => { setNoteVal(card.note || '') }, [card.note])

  // v4.1.5: badge-jelenlét → dinamikus felső hely, hogy a badge-ek ne takarják a dátumot
  const showOverdue = overdueDays >= 2 && !card.is_todo
  const showNotSent = !card.is_todo && card.addr && card.card_date && !card.drive_link && !hideNotSentBadge &&
    !(card.checklist_items||[]).some(ci=>(ci.text==='Für Bearbeitung gesendet' || ci.text==='Beim Bearbeiten')&&ci.done)
  const _isReel = card.card_type && (card.card_type.includes('reel') || card.card_type === 'reel')
  const _reelFertig = (card.checklist_items||[]).some(ci=>ci.text==='Reel Fertig'&&ci.done)
  const _reelDays = card.card_date ? Math.floor((Date.now()-new Date(card.card_date).getTime())/86400000) : 0
  const showReel = _isReel && !card.is_todo && !_reelFertig && !!card.drive_link && _reelDays >= 4
  const badgeRows = (showOverdue ? 1 : 0) + (showNotSent || showReel ? 1 : 0)
  const badgeTopPad = badgeRows >= 2 ? 18 : 0

  function getStaffLocal(id) { return staff.find(s => s.id === id) || { init: '?', color: '#999', avatar_url: null } }

  return (
    <div
      draggable={false}
      data-dragged="0"
      onClick={e => { if (e.currentTarget.dataset.dragged === '1') { e.currentTarget.dataset.dragged = '0'; return } onClick(e) }}
      className={'board-card' + (droppedId===card.id ? ' card-drop-animation' : '')}
      style={{ background: card.card_color ? {'peach':'rgba(255,190,152,.12)','sage':'rgba(156,175,136,.12)','rose':'rgba(212,165,165,.12)'}[card.card_color] || 'var(--bg2)' : (overdueBg || 'var(--bg2)'), border: card.card_color ? '0.5px solid '+({'peach':'rgba(255,190,152,.4)','sage':'rgba(156,175,136,.4)','rose':'rgba(212,165,165,.4)'}[card.card_color]||'var(--border)') : (border || '0.5px solid var(--border)'), borderRadius: 9, padding: compact ? '5px 10px' : '9px 10px', cursor: 'default', boxShadow: border?.includes('f97316') ? '0 0 8px 1px rgba(249,115,22,.35), var(--sh)' : 'var(--sh)', position: 'relative' }}>
      {(dirtyCards?.[card.id] || editingCards?.[card.id]) && <span className="dirty-dot" title={dirtyCards?.[card.id] ? 'Wird gespeichert...' : 'Wird bearbeitet...'} />}
      {(showOverdue || showNotSent || showReel || card.billed_at) && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
          {card.billed_at && (
            <span style={{ background:'#dcfce7', border:'0.5px solid #86efac', color:'#15803d', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, display:'inline-flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-file-euro" style={{ fontSize:9 }}></i>berechnet
            </span>
          )}
          {showOverdue && (
            <span style={{ background: overdueDays >= 5 ? '#a32d2d' : '#e24b4a', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, display:'inline-flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-clock-exclamation" style={{ fontSize:9 }}></i>{Math.floor(overdueDays)} Tage überfällig
            </span>
          )}
          {showNotSent && (
            <span style={{ background:'#fff7ed', border:'0.5px solid #fed7aa', color:'#c2410c', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, display:'inline-flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-send" style={{ fontSize:9 }}></i>Noch nicht gesendet
            </span>
          )}
          {showReel && (
            <span style={{ background:'#fefce8', border:'0.5px solid #fde047', color:'#854d0e', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, display:'inline-flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-video" style={{fontSize:9}}></i>Reel ausstehend
            </span>
          )}
        </div>
      )}
      <div className="card-hover-menu" onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:6, right:6, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,.08)', padding:'4px', display:'flex', alignItems:'center', gap:3, zIndex:10 }}>

        {onCompactToggle && (
          <button onClick={e=>{e.stopPropagation();onCompactToggle()}} title={compact?'Normal anzeigen':'Kompakt anzeigen'}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 5px', borderRadius:5, color:compact?'var(--gold)':'var(--t2)', display:'flex', alignItems:'center', transition:'transform .18s cubic-bezier(.34,1.56,.64,1),background .12s,color .12s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.15)';e.currentTarget.style.background='rgba(184,137,42,.08)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.background='none'}}>
            <i className={compact?'ti ti-layout-kanban':'ti ti-layout-list'} style={{ fontSize:13 }}></i>
          </button>
        )}
        <button onClick={e=>{e.stopPropagation();onClick()}} title="Bearbeiten" style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 5px', borderRadius:5, color:'var(--t2)', display:'flex', alignItems:'center', transition:'transform .18s cubic-bezier(.34,1.56,.64,1),background .12s,color .12s' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.15)';e.currentTarget.style.background='rgba(184,137,42,.08)';e.currentTarget.style.color='var(--gold)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.background='none';e.currentTarget.style.color='var(--t2)'}}>
          <i className="ti ti-pencil" style={{ fontSize:13 }}></i>
        </button>
        <div style={{ width:'0.5px', height:16, background:'var(--border)', flexShrink:0 }}></div>
        {[
          { key:'', color:'#fff', title:'Keine Farbe', noColor:true },
          { key:'peach',  color:'#FFBE98', title:'Peach Fuzz' },
          { key:'sage',   color:'#9CAF88', title:'Sage' },
          { key:'rose',   color:'#D4A5A5', title:'Mellow Rose' },
        ].map(col => (
          <div key={col.key} onClick={e=>{e.stopPropagation();onColorChange&&onColorChange(card, col.key)}}
            title={col.title}
            style={{ width:13, height:13, borderRadius:'50%', background:col.color, border:'1.5px solid '+(col.noColor?'#ccc8c0':col.color), cursor:'pointer', flexShrink:0, transition:'transform .18s cubic-bezier(.34,1.56,.64,1)', position:'relative', boxShadow: (card.card_color||'')===col.key ? '0 0 0 2px #fff, 0 0 0 3.5px '+col.color : 'none' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.22)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            {col.noColor && <div style={{ position:'absolute', top:'50%', left:'50%', width:'130%', height:'1.5px', background:'#e74c3c', transform:'translate(-50%,-50%) rotate(-45deg)', borderRadius:1 }} />}
          </div>
        ))}
      </div>
      {compact && !card.is_todo && (
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0, overflow:'hidden' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.title}</div>
            {card.note && <div style={{ fontSize:10, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{card.note}</div>}
          </div>
          {card.card_date && <div style={{ fontSize:10, color:'var(--t3)', flexShrink:0 }}>{(()=>{const d=card.card_date;return d.slice(8)+'.'+d.slice(5,7)})()}{card.card_time?' '+card.card_time.slice(0,5):''}</div>}
        </div>
      )}
      {compact && !card.is_todo && (
        <div style={{ display:'flex', gap:6, alignItems:'center', minWidth:0 }}>
          <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.title}</div>
            {card.note && <div style={{ fontSize:10, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.note}</div>}
          </div>
          {card.card_date && <div style={{ fontSize:10, color:'var(--t3)', flexShrink:0 }}>{(()=>{const d=card.card_date;return d.slice(8)+'.'+d.slice(5,7)})()}{card.card_time?' '+card.card_time.slice(0,5):''}</div>}
        </div>
      )}
      {!card.is_todo && !compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ background: t.bg, color: t.c, border: '0.5px solid ' + t.br, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', letterSpacing: '.2px', transition:'transform .18s cubic-bezier(.34,1.56,.64,1)', cursor:'default' }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px) scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>{t.l}</span>
          {card.card_date && <span style={{ background:'var(--bg3)', color:'var(--t1)', borderRadius:4, fontSize:10, fontWeight:700, padding:'2px 6px', display:'inline-flex', alignItems:'center', gap:3 }}><i className="ti ti-calendar-event" style={{ fontSize:10, color:'var(--t2)' }}></i>{(()=>{const d=card.card_date;return d.slice(8)+'.'+d.slice(5,7)+'.'+d.slice(2,4)})()}{card.card_time ? ' · '+card.card_time.slice(0,5) : ''}</span>}
          {card.is_gcal && <span style={{ background: 'var(--bluebg)', color: 'var(--blue)', border: '0.5px solid var(--bluebr)', borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px', transition:'transform .18s cubic-bezier(.34,1.56,.64,1)', cursor:'default' }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px) scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>● GCal</span>}
          {tot > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: done === tot ? 'var(--green)' : 'var(--t3)' }}>{done === tot ? '✓ ' : ''}{done}/{tot}</span>}
        </div>
      )}
      <div
        className='card-title-main'
        style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.35, marginBottom: 2, cursor: 'default', userSelect: 'none', display:'flex', alignItems:'center', gap:4, justifyContent:'space-between' }}>
        <i className="ti ti-grip-vertical"
          style={{ fontSize:16, color:'var(--t3)', flexShrink:0, cursor:'grab', padding:'4px 2px', margin:'-4px 0', borderRadius:4, transition:'color .15s' }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--t1)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}
          onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); const card = e.currentTarget.closest('.board-card'); if(card) card.dataset.dragged='0'; onDragStart(e, e.currentTarget.closest('.board-card')) }}
          onTouchStart={e => { e.stopPropagation(); e.preventDefault(); const card = e.currentTarget.closest('.board-card'); if(card) card.dataset.dragged='0'; onDragStart(e, e.currentTarget.closest('.board-card')) }}
        ></i>
        <span style={{ flex:1 }}>{card.title}</span>
      </div>
      {card.addr && !card.is_gcal && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 1 }}>📍 {card.addr}{card.client_name ? ' · ' + card.client_name : ''}</div>}
      {(() => { const cl = clients.find(c => c.name === card.client_name || c.short_name === card.client_name); return cl?.extra_link ? <a href={cl.extra_link} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{ fontSize:10, color:'var(--gold)', display:'flex', alignItems:'center', gap:3, marginBottom:2, textDecoration:'none' }}><i className="ti ti-link" style={{ fontSize:10 }}></i>{cl.extra_link.replace(/^https?:\/\/(www\.)?/,'').slice(0,30)+'…'}</a> : null })()}
      {card.is_gcal && (card.addr || card.client_name) && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 1 }}>📍 {card.addr ? card.addr : card.client_name}{card.addr && card.client_name ? ' · ' + card.client_name : ''}</div>}
      {(() => {
        const cl = clients.find(c => c.name === card.client_name || c.short_name === card.client_name)
        return cl?.dropbox_link ? (
          <a href={cl.dropbox_link} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#e5f3ff', color:'#0061fe', border:'0.5px solid #a8d0ff', borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:600, textDecoration:'none', marginBottom:4, transition:'background .12s' }}
            onMouseEnter={e => e.currentTarget.style.background='#cce5ff'}
            onMouseLeave={e => e.currentTarget.style.background='#e5f3ff'}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#0061fe"><path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4zm-6 13l-6-4 6-4 6 4z"/></svg>
            Fotos hochladen
          </a>
        ) : null
      })()}
      {card.description && (
        <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 2, lineHeight: 1.4, wordBreak:'break-word', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {(/<\/?[a-z][\s\S]*>/i.test(card.description) || card.description.includes('&lt;'))
            ? card.description.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/<\s*br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
            : renderText(card.description, staff)
          }
        </div>
      )}
      <div style={{ position:'relative' }}>
        <textarea value={noteVal} placeholder="Schnellnotiz... (@name taggeléshez)" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} draggable={false}
          onChange={e => {
            setNoteVal(e.target.value)
            onNoteChange(card.id, e.target.value)
            e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'
            const val = e.target.value; const pos = e.target.selectionStart
            const before = val.slice(0,pos); const atIdx = before.lastIndexOf('@')
            if (atIdx>=0 && !before.slice(atIdx+1).includes(' ')) {
              const q = before.slice(atIdx+1)
              if (q === 'all') {
                // @all: mindenki beillesztése
                const names = staff.map(s=>('@'+s.name.split(' ')[0])).join(' ')
                const newVal = val.slice(0,atIdx) + names + ' ' + val.slice(pos)
                onNoteChange(card.id, newVal)
                const ta = document.getElementById('note-'+card.id)
                if (ta) ta.value = newVal
                setNoteMention({ cardId:null, query:'', pos:0 })
              } else {
                setNoteMention({ cardId:card.id, query:q, pos:atIdx })
              }
            } else { setNoteMention({ cardId:null, query:'', pos:0 }) }
          }}
          onKeyDown={e => {
            if (e.key==='Escape') { setNoteMention({ cardId:null, query:'', pos:0 }); return }
            onNoteEnter(e, card.id)
          }}
          onBlur={() => setTimeout(()=>setNoteMention({ cardId:null, query:'', pos:0 }), 150)}
          onFocus={e=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}
          id={'note-'+card.id}
          style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 7px', fontSize: 11, color: 'var(--t2)', fontFamily: 'Arial', resize: 'none', outline: 'none', marginTop: 4, overflow:'hidden', minHeight: 28 }}
          ref={el => { if(el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px' } }} />
        {noteMention.cardId===card.id && (
          <MentionDropdown query={noteMention.query} staff={staff} style={{ bottom:'100%', left:0 }}
            onSelect={s => {
              const ta = document.getElementById('note-'+card.id)
              if (!ta) return
              const before = ta.value.slice(0, noteMention.pos)
              const after = ta.value.slice(ta.selectionStart)
              ta.value = before + '@' + s.name + ' ' + after
              onNoteChange(card.id, ta.value)
              setNoteMention({ cardId:null, query:'', pos:0 })
              ta.focus()
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, paddingTop: 5, borderTop: '1px solid var(--border)' }}>
        <span onClick={e=>{e.stopPropagation();onCheck&&onCheck(card)}} title="Fertig" className="footer-icon-btn" style={{ width:26, height:26, background:'var(--grbg)', color:'var(--green)', border:'0.5px solid var(--grbr)', borderRadius:6, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .12s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px) scale(1.12)';e.currentTarget.style.boxShadow='0 3px 8px rgba(0,0,0,.09)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
          <i className="ti ti-check" style={{ fontSize:11 }}></i>
        </span>
        <span onClick={e=>{e.stopPropagation();onDelete&&onDelete(card)}} title="Löschen" className="footer-icon-btn" style={{ width:26, height:26, background:'var(--rdbg)', color:'var(--red)', border:'0.5px solid var(--rdbr)', borderRadius:6, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .12s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px) scale(1.12)';e.currentTarget.style.boxShadow='0 3px 8px rgba(0,0,0,.09)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
          <i className="ti ti-trash" style={{ fontSize:11 }}></i>
        </span>
        {!card.is_todo && (
          <span onClick={e=>{e.stopPropagation();onSend(card)}} title="Senden" className="footer-icon-btn" style={{ width:26, height:26, background:'var(--grbg)', color:'var(--green)', border:'0.5px solid var(--grbr)', borderRadius:6, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .12s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px) scale(1.12)';e.currentTarget.style.boxShadow='0 3px 8px rgba(0,0,0,.09)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
            <i className="ti ti-send" style={{ fontSize:11 }}></i>
          </span>
        )}
        {(card.card_team || []).length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row-reverse' }}>
            {(card.card_team || []).map((ct, idx) => {
              const s = getStaffLocal(ct.staff_id)
              return (
                <div key={ct.staff_id}
                title={s.name + ' · ' + (onlineUsers[s.id]==='online'?'Online':onlineUsers[s.id]==='away'?'Inaktiv':'Offline')}
                style={{ width:22, height:22, borderRadius:'50%', background:s.color+'22', color:s.color, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:'2px solid var(--bg2)', overflow:'hidden', flexShrink:0, marginRight: idx>0?-7:0, position:'relative', transition:'transform .15s cubic-bezier(.34,1.56,.64,1)', cursor:'pointer' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.25)';e.currentTarget.style.zIndex='10';e.currentTarget.style.border='2px solid '+s.color}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.zIndex='auto';e.currentTarget.style.border='2px solid var(--bg2)'}}>
                {s.avatar_url ? <img src={s.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : s.init}
                <div style={{ position:'absolute', bottom:-1, right:-1, width:7, height:7, borderRadius:'50%', background:onlineUsers[s.id]==='online'?'#15803d':onlineUsers[s.id]==='away'?'#f59e0b':'#8a8278', border:'1.5px solid var(--bg2)', pointerEvents:'none' }} />
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

