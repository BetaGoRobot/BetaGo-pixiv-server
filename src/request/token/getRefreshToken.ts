import ctypto from 'crypto'
import base64 from 'base64url'
import crypto from 'crypto'
import qs from 'qs'
import readline from 'readline-sync'
import axios from 'axios'
import { getHost, getPort } from '../../request/proxy'
import { PixivConst } from '@src/const'
import { config } from '@src/config.pixiv'

const LOGIN_URL = "https://app-api.pixiv.net/web/v1/login"
const REDIRECT_URI = "https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback"
const AUTH_TOKEN_URL = "https://oauth.secure.pixiv.net/auth/token"


if (config.proxy.status) {
    axios.defaults.proxy = {
        host: getHost(),
        port: getPort(),
    }
}

const tokenBase64: (size: number) => string = (size) => {
    return base64(ctypto.randomBytes(size))
}

type RefreshResponse = {
    access_token: string,
    refresh_token: string
}

export const getRefreshToken = async () => {
    const code_verifier = tokenBase64(32)
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64').split('/').join('_').split('+').join('-').split('=').join('');
    const login_params = {
        code_challenge,
        code_challenge_method: 'S256',
        client: 'pixiv-android'
    }
    console.log('Please copy the below link to the brower and login using your account')
    console.log(`🌟 ${LOGIN_URL}?${qs.stringify(login_params)} 🌟`)
    console.log('Before you login, you should enter the F12 to open brower developer.')
    console.log('After you login, you can see the string "pixiv://xxxxxx..." in the console, copy them and input here')
    let token: string = ''
    let isOver = false
    while (!isOver) {
        try {
            token = qs.parse(readline.question('copy the link and patse it here: ').split("?")[1]).code as string
            if (token.length !== 0) {
                isOver = true
            }
        } catch (err) {
            console.log('Your input have some errors, Please input agian')
            isOver = false
        }
    }

    // Pixiv接口的post请求data要求为urlencoded模式
    const res = await axios.post(AUTH_TOKEN_URL, qs.stringify({
        "client_id": PixivConst.Token.CLIENT_ID,
        "client_secret": PixivConst.Token.CLIENT_SECRET,
        "code": token,
        "code_verifier": code_verifier,
        "grant_type": "authorization_code",
        "include_policy": "true",
        "redirect_uri": REDIRECT_URI,
    }), {
        headers: {
            "User-Agent": PixivConst.Request.USER_AGENT,
            "content-type": "application/x-www-form-urlencoded",
        }
    }).catch(err => {
        console.log('RefreshToken获取失败，请检查是否正确输入浏览器中的token')
        return {
            data: {
                refresh_token: '',
                access_token: ''
            }
        }
    })

    return res.data as RefreshResponse
}